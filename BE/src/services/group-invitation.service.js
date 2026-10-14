import crypto from "node:crypto";
import GroupModel from "../models/group.model.js";
import GroupMemberModel from "../models/group-member.model.js";
import GroupInvitationModel from "../models/group-invitation.model.js";
import UserModel from "../models/user.model.js";
import EmailService from "./email.service.js";
import RealtimeService from "./realtime.service.js";
import AppError from "../utils/AppError.js";
import { toPublicInvitation } from "../utils/mappers/invitation.mapper.js";
import { toPublicGroup } from "../utils/mappers/group.mapper.js";
import { toPublicMember } from "../utils/mappers/group-member.mapper.js";

/**
 * GroupInvitationService - Quản lý Vòng đời Lời mời Tham gia Nhóm qua Email
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Kiểm tra phân quyền mời (Lead/Owner, chỉ Owner được mời Lead)
 *   - Sinh token bảo mật 24 giờ, lưu bản băm (SHA-256)
 *   - Gửi email qua Resend (rollback nếu lỗi)
 *   - Xem trước thông tin lời mời (GET an toàn, không đổi dữ liệu)
 *   - Chấp nhận lời mời (so khớp email tài khoản đang đăng nhập, thêm thành viên nguyên tử)
 *   - Gửi lại (hạn 24h mới) và thu hồi lời mời
 */
class GroupInvitationService {
    /**
     * Tạo lời mời mới và gửi email qua Resend
     */
    async createInvitation(groupId, callerId, { email, role = "member" }) {
        const group = await GroupModel.findByIdOrSlug(groupId);
        if (!group) {
            throw AppError.notFound(
                "Không tìm thấy thông tin nhóm",
                "GROUP_NOT_FOUND",
            );
        }

        const normalizedEmail = (email || "").trim().toLowerCase();

        // Chạy song song: kiểm tra caller, đếm thành viên nhóm, và tra cứu tài khoản người nhận
        const [callerMember, memberCount, existingUser] = await Promise.all([
            GroupMemberModel.findMember(group.id, callerId),
            GroupMemberModel.countMembers(group.id),
            UserModel.findByEmail(normalizedEmail),
        ]);

        const isLeadOrOwner =
            callerMember?.role === "owner" || callerMember?.role === "lead";
        if (!isLeadOrOwner) {
            throw AppError.forbidden(
                "Chỉ Lead hoặc Owner mới có quyền mời thành viên vào nhóm",
                "FORBIDDEN",
            );
        }

        if (role === "lead" && callerMember.role !== "owner") {
            throw AppError.forbidden(
                "Chỉ Owner mới có quyền chỉ định vai trò Lead cho người khác",
                "FORBIDDEN",
            );
        }

        // Kiểm tra sức chứa nhóm
        const capacity = parseInt(group.capacity || 10, 10);
        if (memberCount >= capacity) {
            throw AppError.badRequest(
                `Nhóm đã đạt số lượng tối đa (${capacity} thành viên)`,
                "GROUP_CAPACITY_FULL",
            );
        }

        // Kiểm tra xem người nhận đã là thành viên trong nhóm chưa
        if (existingUser) {
            const isAlreadyMember = await GroupMemberModel.findMember(
                group.id,
                existingUser.id,
            );
            if (isAlreadyMember) {
                throw AppError.conflict(
                    "Người dùng này đã là thành viên trong nhóm",
                    "ALREADY_MEMBER",
                );
            }
        }

        // Sinh token ngẫu nhiên và băm SHA-256
        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 giờ

        const invitation = await GroupInvitationModel.create({
            groupId: group.id,
            email: normalizedEmail,
            role,
            tokenHash,
            invitedBy: callerId,
            expiresAt,
        });

        const clientOrigin =
            process.env.CLIENT_ORIGIN || "http://localhost:5173";
        const inviteUrl = `${clientOrigin}/invite/${token}`;

        // Tận dụng thông tin user đã được JOIN trong callerMember, loại bỏ query trùng lặp
        const inviterName =
            callerMember?.full_name || callerMember?.name || "Quản trị viên";

        // Gửi email qua Resend. Nếu thất bại -> hoàn tác lời mời và trả lỗi rõ ràng
        try {
            await EmailService.sendGroupInvitation({
                email: normalizedEmail,
                groupName: group.name,
                inviterName,
                role,
                inviteUrl,
                expiresInHours: 24,
            });
        } catch (err) {
            await GroupInvitationModel.delete(invitation.id);
            throw err;
        }

        // Vô hiệu hóa link cũ trong nền không làm nghẽn phản hồi HTTP
        GroupInvitationModel.revokeActiveByGroupAndEmail(
            group.id,
            normalizedEmail,
            callerId,
            invitation.id,
        ).catch((revErr) =>
            console.warn("Background revoke error:", revErr.message),
        );

        return {
            invitation: toPublicInvitation({
                ...invitation,
                group_name: group.name,
                group_slug: group.slug,
                inviter_name: inviterName,
            }),
            inviteLink: inviteUrl,
        };
    }

    /**
     * Xem trước thông tin lời mời (Public endpoint - An toàn, 1 roundtrip duy nhất)
     */
    async getInvitationPreview(token) {
        if (!token) {
            throw AppError.notFound(
                "Không tìm thấy thông tin lời mời",
                "INVITATION_NOT_FOUND",
            );
        }

        const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");
        const inv = await GroupInvitationModel.findByTokenHash(tokenHash);
        if (!inv) {
            throw AppError.notFound(
                "Không tìm thấy thông tin lời mời hoặc liên kết không hợp lệ",
                "INVITATION_NOT_FOUND",
            );
        }

        // findByTokenHash đã JOIN sẵn group, inviter và member_count trong 1 query duy nhất!
        const capacity = parseInt(inv.group_capacity || 10, 10);
        const memberCount = parseInt(inv.member_count ?? 1, 10);

        const isExpired = new Date(inv.expires_at) <= new Date();
        const isAccepted =
            inv.status === "accepted" || Boolean(inv.accepted_at);
        const isRevoked = inv.status === "revoked" || Boolean(inv.revoked_at);
        const isGroupFull = memberCount >= capacity;

        return {
            id: inv.id,
            email: (inv.email || "").toLowerCase(),
            role: inv.role,
            status: inv.status,
            expiresAt: inv.expires_at,
            isExpired,
            isAccepted,
            isRevoked,
            isGroupFull,
            group: inv.group_name
                ? {
                      id: inv.group_id,
                      name: inv.group_name,
                      slug: inv.group_slug || "",
                      description: inv.group_description || "",
                      icon: inv.group_icon || "Users",
                      color: inv.group_color || "indigo",
                      capacity,
                      memberCount,
                  }
                : null,
            inviter: {
                name: inv.inviter_name || "Quản trị viên",
                email: inv.inviter_email || "",
            },
        };
    }

    /**
     * Chấp nhận lời mời tham gia nhóm (Yêu cầu đăng nhập tài khoản có email khớp)
     */
    async acceptInvitation(token, currentUser) {
        if (!token) {
            throw AppError.notFound(
                "Không tìm thấy thông tin lời mời",
                "INVITATION_NOT_FOUND",
            );
        }

        const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");
        const inv = await GroupInvitationModel.findByTokenHash(tokenHash);
        if (!inv) {
            throw AppError.notFound(
                "Không tìm thấy thông tin lời mời hoặc liên kết không hợp lệ",
                "INVITATION_NOT_FOUND",
            );
        }

        if (inv.status === "revoked" || Boolean(inv.revoked_at)) {
            throw AppError.badRequest(
                "Lời mời này đã bị thu hồi bởi ban quản trị",
                "INVITATION_REVOKED",
            );
        }

        if (inv.status === "accepted" || Boolean(inv.accepted_at)) {
            throw AppError.badRequest(
                "Lời mời này đã được chấp nhận trước đó",
                "INVITATION_ALREADY_ACCEPTED",
            );
        }

        if (new Date(inv.expires_at) <= new Date()) {
            throw AppError.badRequest(
                "Lời mời đã hết hạn sau 24 giờ. Vui lòng yêu cầu lời mời mới.",
                "INVITATION_EXPIRED",
            );
        }

        // So khớp email tài khoản đang đăng nhập
        const currentEmail = (currentUser?.email || "").trim().toLowerCase();
        const invitedEmail = (inv.email || "").trim().toLowerCase();
        if (currentEmail !== invitedEmail) {
            throw AppError.forbidden(
                `Lời mời này được gửi tới email ${invitedEmail}, nhưng bạn đang đăng nhập với tài khoản ${currentEmail}. Vui lòng đổi tài khoản để tiếp tục.`,
                "EMAIL_MISMATCH",
            );
        }

        // Thêm thành viên và consume lời mời trong cùng transaction.
        const groupRole = inv.role === "lead" ? "leadership" : "core";
        const newMember = await GroupInvitationModel.acceptWithMember({
            id: inv.id,
            userId: currentUser.id,
            role: inv.role || "member",
            groupRole,
        });

        const publicMember = toPublicMember({
            ...newMember,
            email: currentUser.email,
            full_name: currentUser.full_name || currentUser.name,
            avatar_url: currentUser.avatar_url,
        });

        RealtimeService.broadcastGroupUpdate(inv.group_id, "MEMBER_ADDED", {
            member: publicMember,
        });

        const group = await GroupModel.findById(inv.group_id);
        return {
            member: publicMember,
            group: toPublicGroup(group),
        };
    }

    /**
     * Lấy danh sách lời mời đang chờ của nhóm (Chỉ Lead/Owner - song song hóa truy vấn)
     */
    async getPendingInvitations(groupId, callerId) {
        const group = await GroupModel.findByIdOrSlug(groupId);
        if (!group) {
            throw AppError.notFound(
                "Không tìm thấy thông tin nhóm",
                "GROUP_NOT_FOUND",
            );
        }

        const [callerMember, list] = await Promise.all([
            GroupMemberModel.findMember(group.id, callerId),
            GroupInvitationModel.findPendingByGroupId(group.id),
        ]);

        const isLeadOrOwner =
            callerMember?.role === "owner" || callerMember?.role === "lead";
        if (!isLeadOrOwner) {
            throw AppError.forbidden(
                "Bạn không có quyền xem danh sách lời mời của nhóm",
                "FORBIDDEN",
            );
        }

        return list.map((item) =>
            toPublicInvitation(item),
        );
    }

    /**
     * Thu hồi lời mời (Chỉ Lead/Owner)
     */
    async revokeInvitation(groupId, callerId, invitationId) {
        const group = await GroupModel.findByIdOrSlug(groupId);
        if (!group) {
            throw AppError.notFound(
                "Không tìm thấy thông tin nhóm",
                "GROUP_NOT_FOUND",
            );
        }

        const callerMember = await GroupMemberModel.findMember(
            group.id,
            callerId,
        );
        const isLeadOrOwner =
            callerMember?.role === "owner" || callerMember?.role === "lead";
        if (!isLeadOrOwner) {
            throw AppError.forbidden(
                "Bạn không có quyền thu hồi lời mời",
                "FORBIDDEN",
            );
        }

        const invitation = await GroupInvitationModel.findById(invitationId);
        if (!invitation || invitation.group_id !== group.id) {
            throw AppError.notFound(
                "Không tìm thấy thông tin lời mời",
                "INVITATION_NOT_FOUND",
            );
        }
        if (
            invitation.status !== "pending" ||
            invitation.revoked_at ||
            invitation.accepted_at
        ) {
            throw AppError.conflict(
                "Chỉ có thể thu hồi lời mời đang chờ",
                "INVITATION_NOT_PENDING",
            );
        }

        if (invitation.role === "lead" && callerMember.role !== "owner") {
            throw AppError.forbidden(
                "Chỉ Owner mới có quyền thu hồi lời mời vai trò Lead",
                "FORBIDDEN",
            );
        }

        await GroupInvitationModel.updateStatus(invitation.id, {
            status: "revoked",
            revokedAt: new Date(),
            revokedBy: callerId,
        });

        return {
            success: true,
            message: "Đã thu hồi lời mời thành công",
            id: invitationId,
        };
    }

    /**
     * Gửi lại lời mời: Vô hiệu hóa lời mời cũ, cấp hạn 24 giờ mới và gửi email mới
     */
    async resendInvitation(groupId, callerId, invitationId) {
        const group = await GroupModel.findByIdOrSlug(groupId);
        if (!group) {
            throw AppError.notFound(
                "Không tìm thấy thông tin nhóm",
                "GROUP_NOT_FOUND",
            );
        }

        const callerMember = await GroupMemberModel.findMember(
            group.id,
            callerId,
        );
        const isLeadOrOwner =
            callerMember?.role === "owner" || callerMember?.role === "lead";
        if (!isLeadOrOwner) {
            throw AppError.forbidden(
                "Bạn không có quyền gửi lại lời mời",
                "FORBIDDEN",
            );
        }

        const oldInv = await GroupInvitationModel.findById(invitationId);
        if (!oldInv || oldInv.group_id !== group.id) {
            throw AppError.notFound(
                "Không tìm thấy thông tin lời mời",
                "INVITATION_NOT_FOUND",
            );
        }
        if (
            oldInv.status !== "pending" ||
            oldInv.revoked_at ||
            oldInv.accepted_at
        ) {
            throw AppError.conflict(
                "Chỉ có thể gửi lại lời mời đang chờ",
                "INVITATION_NOT_PENDING",
            );
        }

        if (oldInv.role === "lead" && callerMember.role !== "owner") {
            throw AppError.forbidden(
                "Chỉ Owner mới có quyền gửi lại lời mời vai trò Lead",
                "FORBIDDEN",
            );
        }

        return this.createInvitation(group.id, callerId, {
            email: oldInv.email,
            role: oldInv.role,
        });
    }
}

export default GroupInvitationService;
