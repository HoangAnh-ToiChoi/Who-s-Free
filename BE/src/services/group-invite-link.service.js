import crypto from "node:crypto";
import GroupModel from "../models/group.model.js";
import GroupMemberModel from "../models/group-member.model.js";
import GroupInviteLinkModel from "../models/group-invite-link.model.js";
import AppError from "../utils/AppError.js";
import {
  toPublicInviteLink,
  toPublicJoinPreview,
} from "../utils/mappers/group-invite-link.mapper.js";
import { toPublicGroup } from "../utils/mappers/group.mapper.js";
import { toPublicMember } from "../utils/mappers/group-member.mapper.js";

/**
 * GroupInviteLinkService - Quản lý liên kết tham gia nhóm trực tiếp
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Tạo / làm mới link mời (chỉ Lead/Owner)
 *   - Lấy link mời hiện tại của nhóm
 *   - Xem trước thông tin nhóm từ link mời (Public preview)
 *   - Tham gia nhóm từ link mời với kiểm tra capacity và membership
 */
class GroupInviteLinkService {
  constructor() {
    this.clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
  }

  /**
   * Tạo / làm mới liên kết mời (hạn 24 giờ)
   */
  async generateInviteLink(groupId, callerId) {
    const group = await GroupModel.findByIdOrSlug(groupId);
    if (!group) {
      throw AppError.notFound("Không tìm thấy thông tin nhóm", "GROUP_NOT_FOUND");
    }

    const callerMember = await GroupMemberModel.findMember(group.id, callerId);
    const isLeadOrOwner =
      callerMember?.role === "owner" || callerMember?.role === "lead";
    if (!isLeadOrOwner) {
      throw AppError.forbidden(
        "Chỉ Lead hoặc Owner mới có quyền tạo liên kết tham gia nhóm",
        "FORBIDDEN"
      );
    }

    await GroupInviteLinkModel.revokeActiveByGroupId(group.id, callerId);

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const record = await GroupInviteLinkModel.create({
      groupId: group.id,
      token,
      createdBy: callerId,
      expiresAt,
    });

    return toPublicInviteLink(record, this.clientOrigin);
  }

  /**
   * Lấy liên kết mời hiện tại của nhóm
   */
  async getInviteLink(groupId, callerId) {
    const group = await GroupModel.findByIdOrSlug(groupId);
    if (!group) {
      throw AppError.notFound("Không tìm thấy thông tin nhóm", "GROUP_NOT_FOUND");
    }

    const callerMember = await GroupMemberModel.findMember(group.id, callerId);
    const isLeadOrOwner =
      callerMember?.role === "owner" || callerMember?.role === "lead";
    if (!isLeadOrOwner) {
      throw AppError.forbidden(
        "Chỉ Lead hoặc Owner mới có quyền xem liên kết tham gia nhóm",
        "FORBIDDEN"
      );
    }

    const activeLink = await GroupInviteLinkModel.findActiveByGroupId(group.id);
    if (!activeLink) {
      return { token: null, expiresAt: null, inviteUrl: null };
    }

    return toPublicInviteLink(activeLink, this.clientOrigin);
  }

  /**
   * Xem trước thông tin link mời (Public preview)
   */
  async getJoinPreview(token) {
    const link = await GroupInviteLinkModel.findByToken(token);
    if (!link) {
      throw AppError.notFound(
        "Liên kết tham gia không tồn tại hoặc không hợp lệ",
        "INVITATION_NOT_FOUND"
      );
    }

    return toPublicJoinPreview(link);
  }

  /**
   * Tham gia nhóm thông qua link mời (Authenticated)
   */
  async joinGroup(token, user) {
    const link = await GroupInviteLinkModel.findByToken(token);
    if (!link) {
      throw AppError.notFound(
        "Liên kết tham gia không tồn tại hoặc không hợp lệ",
        "INVITATION_NOT_FOUND"
      );
    }

    if (link.revoked_at) {
      throw AppError.badRequest(
        "Liên kết tham gia đã bị vô hiệu hóa",
        "INVITATION_REVOKED"
      );
    }

    if (new Date(link.expires_at) <= new Date()) {
      throw AppError.badRequest(
        "Liên kết tham gia đã hết hạn",
        "INVITATION_EXPIRED"
      );
    }

    const member = await GroupMemberModel.addMemberWithCapacityCheck({
      groupId: link.group_id,
      userId: user.id,
      role: "member",
      groupRole: "core",
    });

    const group = await GroupModel.findById(link.group_id);

    return {
      member: toPublicMember({
        ...member,
        email: user.email,
        full_name: user.full_name || user.fullName,
        avatar_url: user.avatar_url || user.avatarUrl,
      }),
      group: toPublicGroup(group),
    };
  }
}

export default GroupInviteLinkService;
