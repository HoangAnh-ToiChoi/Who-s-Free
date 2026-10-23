import crypto from "node:crypto";
import GroupModel from "../models/group.model.js";
import GroupMemberModel from "../models/group-member.model.js";
import GroupInvitationModel from "../models/group-invitation.model.js";
import UserModel from "../models/user.model.js";
import EmailService from "./email.service.js";
import RealtimeService from "./realtime.service.js";
import AppError from "../utils/AppError.js";
import { isLeadOrOwner } from "../utils/permissions.js";
import { toPublicInvitation } from "../utils/mappers/invitation.mapper.js";
import { toPublicGroup } from "../utils/mappers/group.mapper.js";
import { toPublicMember } from "../utils/mappers/group-member.mapper.js";

class GroupInvitationService {
    // Dùng ở createInvitation, getPendingInvitations, revokeInvitation, resendInvitation
    async #requireGroupAccess(groupId, callerId) {
        const group = await GroupModel.findByIdOrSlug(groupId);
        if (!group) throw AppError.notFound("Không tìm thấy thông tin nhóm", "GROUP_NOT_FOUND");
        const callerMember = await GroupMemberModel.findMember(group.id, callerId);
        return { group, callerMember, isLeadOrOwner: isLeadOrOwner(callerMember) };
    }

    // Dùng ở getInvitationPreview và acceptInvitation
    #hashToken(token) {
        return crypto.createHash("sha256").update(token).digest("hex");
    }

    async createInvitation(groupId, callerId, { email, role = "member" }) {
        const { group, callerMember, isLeadOrOwner } = await this.#requireGroupAccess(groupId, callerId);

        if (!isLeadOrOwner) throw AppError.forbidden("Chỉ Lead hoặc Owner mới có quyền mời thành viên vào nhóm", "FORBIDDEN");
        if (role === "lead" && callerMember.role !== "owner") throw AppError.forbidden("Chỉ Owner mới có quyền chỉ định vai trò Lead", "FORBIDDEN");

        const normalizedEmail = (email || "").trim().toLowerCase();

        const [memberCount, existingUser] = await Promise.all([
            GroupMemberModel.countMembers(group.id),
            UserModel.findByEmail(normalizedEmail),
        ]);

        const capacity = parseInt(group.capacity || 10, 10);
        if (memberCount >= capacity) throw AppError.badRequest(`Nhóm đã đạt số lượng tối đa (${capacity} thành viên)`, "GROUP_CAPACITY_FULL");

        if (existingUser) {
            const isAlreadyMember = await GroupMemberModel.findMember(group.id, existingUser.id);
            if (isAlreadyMember) throw AppError.conflict("Người dùng này đã là thành viên trong nhóm", "ALREADY_MEMBER");
        }

        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const invitation = await GroupInvitationModel.create({
            groupId: group.id,
            email: normalizedEmail,
            role,
            tokenHash: this.#hashToken(token),
            invitedBy: callerId,
            expiresAt,
        });

        const inviteUrl = `${process.env.CLIENT_ORIGIN || "http://localhost:5173"}/invite/${token}`;
        const inviterName = callerMember?.full_name || callerMember?.name || "Quản trị viên";

        try {
            await EmailService.sendGroupInvitation({ email: normalizedEmail, groupName: group.name, inviterName, role, inviteUrl, expiresInHours: 24 });
        } catch (err) {
            await GroupInvitationModel.delete(invitation.id);
            throw err;
        }

        GroupInvitationModel.revokeActiveByGroupAndEmail(group.id, normalizedEmail, callerId, invitation.id)
            .catch((revErr) => console.warn("Background revoke error:", revErr.message));

        return {
            invitation: toPublicInvitation({ ...invitation, group_name: group.name, group_slug: group.slug, inviter_name: inviterName }),
            inviteLink: inviteUrl,
        };
    }

    async getInvitationPreview(token) {
        if (!token) throw AppError.notFound("Không tìm thấy thông tin lời mời", "INVITATION_NOT_FOUND");

        const inv = await GroupInvitationModel.findByTokenHash(this.#hashToken(token));
        if (!inv) throw AppError.notFound("Không tìm thấy thông tin lời mời hoặc liên kết không hợp lệ", "INVITATION_NOT_FOUND");

        const capacity = parseInt(inv.group_capacity || 10, 10);
        const memberCount = parseInt(inv.member_count ?? 1, 10);

        return {
            id: inv.id,
            email: (inv.email || "").toLowerCase(),
            role: inv.role,
            status: inv.status,
            expiresAt: inv.expires_at,
            isExpired: new Date(inv.expires_at) <= new Date(),
            isAccepted: inv.status === "accepted" || Boolean(inv.accepted_at),
            isRevoked: inv.status === "revoked" || Boolean(inv.revoked_at),
            isGroupFull: memberCount >= capacity,
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
            inviter: { name: inv.inviter_name || "Quản trị viên", email: inv.inviter_email || "" },
        };
    }

    async acceptInvitation(token, currentUser) {
        if (!token) throw AppError.notFound("Không tìm thấy thông tin lời mời", "INVITATION_NOT_FOUND");

        const inv = await GroupInvitationModel.findByTokenHash(this.#hashToken(token));
        if (!inv) throw AppError.notFound("Không tìm thấy thông tin lời mời hoặc liên kết không hợp lệ", "INVITATION_NOT_FOUND");

        if (inv.status === "revoked" || Boolean(inv.revoked_at)) throw AppError.badRequest("Lời mời này đã bị thu hồi bởi ban quản trị", "INVITATION_REVOKED");
        if (inv.status === "accepted" || Boolean(inv.accepted_at)) throw AppError.badRequest("Lời mời này đã được chấp nhận trước đó", "INVITATION_ALREADY_ACCEPTED");
        if (new Date(inv.expires_at) <= new Date()) throw AppError.badRequest("Lời mời đã hết hạn sau 24 giờ. Vui lòng yêu cầu lời mời mới.", "INVITATION_EXPIRED");

        const currentEmail = (currentUser?.email || "").trim().toLowerCase();
        const invitedEmail = (inv.email || "").trim().toLowerCase();
        if (currentEmail !== invitedEmail) {
            throw AppError.forbidden(
                `Lời mời này được gửi tới email ${invitedEmail}, nhưng bạn đang đăng nhập với tài khoản ${currentEmail}. Vui lòng đổi tài khoản để tiếp tục.`,
                "EMAIL_MISMATCH",
            );
        }

        const newMember = await GroupInvitationModel.acceptWithMember({
            id: inv.id,
            userId: currentUser.id,
            role: inv.role || "member",
            groupRole: inv.role === "lead" ? "leadership" : "core",
        });

        const publicMember = toPublicMember({
            ...newMember,
            email: currentUser.email,
            full_name: currentUser.full_name || currentUser.name,
            avatar_url: currentUser.avatar_url,
        });

        RealtimeService.broadcastGroupUpdate(inv.group_id, "MEMBER_ADDED", { member: publicMember });

        const group = await GroupModel.findById(inv.group_id);
        return { member: publicMember, group: toPublicGroup(group) };
    }

    async getPendingInvitations(groupId, callerId) {
        const { group, isLeadOrOwner } = await this.#requireGroupAccess(groupId, callerId);
        if (!isLeadOrOwner) throw AppError.forbidden("Bạn không có quyền xem danh sách lời mời của nhóm", "FORBIDDEN");
        const list = await GroupInvitationModel.findPendingByGroupId(group.id);
        return list.map(toPublicInvitation);
    }

    async revokeInvitation(groupId, callerId, invitationId) {
        const { group, callerMember, isLeadOrOwner } = await this.#requireGroupAccess(groupId, callerId);
        if (!isLeadOrOwner) throw AppError.forbidden("Bạn không có quyền thu hồi lời mời", "FORBIDDEN");

        const invitation = await GroupInvitationModel.findById(invitationId);
        if (!invitation || invitation.group_id !== group.id) throw AppError.notFound("Không tìm thấy thông tin lời mời", "INVITATION_NOT_FOUND");
        if (invitation.status !== "pending" || invitation.revoked_at || invitation.accepted_at) throw AppError.conflict("Chỉ có thể thu hồi lời mời đang chờ", "INVITATION_NOT_PENDING");
        if (invitation.role === "lead" && callerMember.role !== "owner") throw AppError.forbidden("Chỉ Owner mới có quyền thu hồi lời mời vai trò Lead", "FORBIDDEN");

        await GroupInvitationModel.updateStatus(invitation.id, { status: "revoked", revokedAt: new Date(), revokedBy: callerId });
        return { success: true, message: "Đã thu hồi lời mời thành công", id: invitationId };
    }

    async resendInvitation(groupId, callerId, invitationId) {
        const { group, callerMember, isLeadOrOwner } = await this.#requireGroupAccess(groupId, callerId);
        if (!isLeadOrOwner) throw AppError.forbidden("Bạn không có quyền gửi lại lời mời", "FORBIDDEN");

        const oldInv = await GroupInvitationModel.findById(invitationId);
        if (!oldInv || oldInv.group_id !== group.id) throw AppError.notFound("Không tìm thấy thông tin lời mời", "INVITATION_NOT_FOUND");
        if (oldInv.status !== "pending" || oldInv.revoked_at || oldInv.accepted_at) throw AppError.conflict("Chỉ có thể gửi lại lời mời đang chờ", "INVITATION_NOT_PENDING");
        if (oldInv.role === "lead" && callerMember.role !== "owner") throw AppError.forbidden("Chỉ Owner mới có quyền gửi lại lời mời vai trò Lead", "FORBIDDEN");

        return this.createInvitation(group.id, callerId, { email: oldInv.email, role: oldInv.role });
    }
}

export default GroupInvitationService;
