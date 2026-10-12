import GroupModel from "../models/group.model.js";
import GroupMemberModel from "../models/group-member.model.js";
import UserModel from "../models/user.model.js";
import RealtimeService from "./realtime.service.js";
import AppError from "../utils/AppError.js";

/**
 * GroupMemberService - Quản lý Thành viên và Phân quyền Nhóm
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Lấy danh sách thành viên
 *   - Thêm thành viên mới (chỉ Lead/Owner)
 *   - Xóa thành viên hoặc Rời nhóm (kiểm soát phân quyền chặt chẽ)
 */
class GroupMemberService {
  /**
   * Lấy danh sách thành viên của một nhóm (Chỉ dành cho Owner, Lead, và Member của nhóm)
   */
  async getMembers(groupId, userId) {
    const group = await GroupModel.findByIdOrSlug(groupId);
    if (!group) {
      throw AppError.notFound("Không tìm thấy thông tin nhóm", "GROUP_NOT_FOUND");
    }

    // MEMBERS-02: Xác minh caller là thành viên của nhóm; trả 403 cho outsider
    const callerMember = await GroupMemberModel.findMember(group.id, userId);
    if (!callerMember) {
      throw AppError.forbidden("Bạn không phải thành viên của nhóm này", "FORBIDDEN");
    }

    const members = await GroupMemberModel.getGroupMembers(group.id);
    return members.map((m) => GroupMemberModel.toPublicMember(m));
  }

  /**
   * Thêm thành viên vào nhóm (Yêu cầu quyền Lead hoặc Owner)
   */
  async addMember(groupId, callerId, { email, userId, role = "member", groupRole = "core" }) {
    const group = await GroupModel.findByIdOrSlug(groupId);
    if (!group) {
      throw AppError.notFound("Không tìm thấy thông tin nhóm", "GROUP_NOT_FOUND");
    }

    // 1. Kiểm tra quyền Lead/Owner của người thực hiện thao tác
    const callerMember = await GroupMemberModel.findMember(group.id, callerId);
    const isLeadOrOwner = callerMember?.role === "owner" || callerMember?.role === "lead";

    if (!isLeadOrOwner) {
      throw AppError.forbidden("Chỉ Lead hoặc Owner mới có quyền thêm thành viên vào nhóm", "FORBIDDEN");
    }

    // ADD-10: Chính sách Role Promotion: Chỉ Owner mới có quyền cấp quyền Lead cho người khác
    if (role === "lead" && callerMember.role !== "owner") {
      throw AppError.forbidden("Chỉ Owner mới có quyền chỉ định vai trò Lead cho thành viên khác", "FORBIDDEN");
    }

    // 2. Tìm người dùng cần thêm
    let targetUser = null;
    if (email) {
      targetUser = await UserModel.findByEmail(email);
      if (!targetUser) {
        throw AppError.notFound(`Không tìm thấy người dùng có email: ${email}`, "USER_NOT_FOUND");
      }
    } else if (userId) {
      targetUser = await UserModel.findById(userId);
      if (!targetUser) {
        throw AppError.notFound("Không tìm thấy người dùng với ID đã cung cấp", "USER_NOT_FOUND");
      }
    }

    // 3. Kiểm tra xem người dùng đã là thành viên trong nhóm chưa
    const existing = await GroupMemberModel.findMember(group.id, targetUser.id);
    if (existing) {
      throw AppError.conflict("Người dùng này đã là thành viên trong nhóm", "ALREADY_MEMBER");
    }

    // 4. Thêm thành viên mới có khóa hàng và kiểm tra sức chứa nguyên tử
    const newMember = await GroupMemberModel.addMemberWithCapacityCheck({
      groupId: group.id,
      userId: targetUser.id,
      role,
      groupRole,
    });

    const publicMember = GroupMemberModel.toPublicMember({
      ...newMember,
      email: targetUser.email,
      full_name: targetUser.full_name || targetUser.name,
      avatar_url: targetUser.avatar_url,
    });

    // 5. Phát sự kiện Realtime tới toàn bộ client trong nhóm
    RealtimeService.broadcastGroupUpdate(group.id, "MEMBER_ADDED", { member: publicMember });

    return publicMember;
  }

  /**
   * Xóa thành viên khỏi nhóm hoặc Rời nhóm
   */
  async removeMember(groupId, callerId, targetUserId) {
    const isTargetUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUserId);
    if (!isTargetUuid) {
      throw AppError.badRequest("userId không đúng định dạng UUID", "INVALID_ID");
    }

    const group = await GroupModel.findByIdOrSlug(groupId);
    if (!group) {
      throw AppError.notFound("Không tìm thấy thông tin nhóm", "GROUP_NOT_FOUND");
    }

    const callerMember = await GroupMemberModel.findMember(group.id, callerId);
    if (!callerMember) {
      throw AppError.forbidden("Bạn không phải thành viên của nhóm này", "FORBIDDEN");
    }

    const targetMember = await GroupMemberModel.findMember(group.id, targetUserId);
    if (!targetMember) {
      throw AppError.notFound("Không tìm thấy thành viên cần xóa trong nhóm", "MEMBER_NOT_FOUND");
    }

    const isSelfLeaving = callerId === targetUserId;

    if (isSelfLeaving) {
      // Trường hợp tự rời nhóm: Owner không được phép rời nếu chưa chuyển quyền
      if (callerMember.role === "owner") {
        throw AppError.badRequest(
          "Owner không thể rời nhóm. Vui lòng chuyển quyền Owner cho thành viên khác trước.",
          "OWNER_CANNOT_LEAVE"
        );
      }
    } else {
      // Trường hợp xóa người khác: Phải có quyền Lead hoặc Owner
      const isLeadOrOwner = callerMember.role === "owner" || callerMember.role === "lead";
      if (!isLeadOrOwner) {
        throw AppError.forbidden("Bạn không có quyền xóa thành viên khỏi nhóm", "FORBIDDEN");
      }

      // Tuyệt đối không ai được xóa Owner
      if (targetMember.role === "owner") {
        throw AppError.forbidden("Không thể xóa Owner khỏi nhóm", "CANNOT_REMOVE_OWNER");
      }

      // Lead không được phép xóa một Lead khác (Chỉ Owner mới có quyền)
      if (targetMember.role === "lead" && callerMember.role !== "owner") {
        throw AppError.forbidden("Chỉ Owner mới có quyền xóa Lead khác khỏi nhóm", "FORBIDDEN");
      }
    }

    await GroupMemberModel.removeMember(group.id, targetUserId);

    // Phát sự kiện Realtime
    RealtimeService.broadcastGroupUpdate(group.id, "MEMBER_REMOVED", {
      groupId: group.id,
      userId: targetUserId,
      isSelfLeaving,
    });

    return {
      success: true,
      message: isSelfLeaving ? "Đã rời nhóm thành công" : "Đã xóa thành viên khỏi nhóm thành công",
      userId: targetUserId,
      groupId: group.id,
    };
  }
}

export default GroupMemberService;
