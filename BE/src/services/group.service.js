import GroupModel from "../models/group.model.js";
import GroupMemberModel from "../models/group-member.model.js";
import UserModel from "../models/user.model.js";
import RealtimeService from "./realtime.service.js";
import AppError from "../utils/AppError.js";
import { generateUniqueSlug } from "../utils/slugify.js";

/**
 * GroupService - Quản lý Vòng đời Nhóm / Workspace
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Tạo nhóm mới, gán Creator làm Owner
 *   - Lấy danh sách nhóm của user và chi tiết nhóm
 *   - Cập nhật, xóa nhóm theo quyền Owner/Lead
 */
class GroupService {
  /**
   * Tạo nhóm mới và gán Creator làm Owner trong cùng một Transaction nguyên tử
   */
  async createGroup(userId, payload) {
    if (!userId) {
      throw AppError.unauthorized("Vui lòng đăng nhập để tạo nhóm", "UNAUTHORIZED");
    }

    const slug = generateUniqueSlug(payload.name);

    // Tạo nhóm trong bảng groups và gán Creator làm Owner trong 1 Transaction duy nhất
    const created = await GroupModel.createWithLeader(
      {
        ...payload,
        slug,
      },
      userId
    );

    const creator = await UserModel.findById(userId).catch(() => null);
    const creatorName =
      creator?.fullName ||
      creator?.full_name ||
      creator?.name ||
      creator?.user_metadata?.full_name ||
      "Trưởng nhóm";
    const publicGroup = GroupModel.toPublicGroup({
      ...created,
      leadAdmin: creatorName,
      memberCount: 1,
      userRole: "owner",
      userGroupRole: "leadership",
      memberPreviews: [
        {
          id: userId,
          name: creatorName,
          avatarUrl: creator?.avatarUrl || creator?.avatar_url || null,
        },
      ],
    });

    // Phát sự kiện Realtime
    RealtimeService.broadcastGroupUpdate(created.id, "GROUP_CREATED", publicGroup);

    return publicGroup;
  }

  /**
   * Lấy danh sách các nhóm mà người dùng tham gia
   */
  async getUserGroups(userId) {
    const list = await GroupModel.findUserGroups(userId);
    return list.map((g) => GroupModel.toPublicGroup(g));
  }

  /**
   * Lấy chi tiết thông tin một nhóm theo ID hoặc Slug (1 roundtrip duy nhất)
   */
  async getGroupDetail(groupIdOrSlug, userId) {
    const detail = await GroupModel.findDetailByIdOrSlug(groupIdOrSlug, userId);
    if (!detail) {
      throw AppError.notFound("Không tìm thấy thông tin nhóm", "GROUP_NOT_FOUND");
    }

    return GroupModel.toPublicGroup(detail);
  }

  /**
   * Cập nhật thông tin nhóm (Chỉ Owner hoặc Lead)
   */
  async updateGroup(groupId, userId, payload) {
    const group = await GroupModel.findById(groupId);
    if (!group) {
      throw AppError.notFound("Không tìm thấy nhóm cần cập nhật", "GROUP_NOT_FOUND");
    }

    const member = await GroupMemberModel.findMember(groupId, userId);
    const isLeadOrOwner = member?.role === "owner" || member?.role === "lead";

    if (!isLeadOrOwner) {
      throw AppError.forbidden("Chỉ Lead hoặc Owner mới có quyền chỉnh sửa nhóm", "FORBIDDEN");
    }

    // UPDATE-08: Không cho phép giảm capacity thấp hơn số thành viên hiện tại
    if (payload.capacity !== undefined) {
      const currentMemberCount = await GroupMemberModel.countMembers(groupId);
      if (payload.capacity < currentMemberCount) {
        throw AppError.badRequest(
          `Không thể giảm sức chứa (${payload.capacity}) xuống thấp hơn số lượng thành viên hiện tại (${currentMemberCount})`,
          "INVALID_CAPACITY"
        );
      }
    }

    const updated = await GroupModel.update(groupId, payload);
    const publicGroup = GroupModel.toPublicGroup(updated);

    RealtimeService.broadcastGroupUpdate(groupId, "GROUP_UPDATED", publicGroup);
    return publicGroup;
  }

  /**
   * Xóa nhóm (Chỉ Owner mới có quyền giải tán nhóm)
   */
  async deleteGroup(groupId, userId) {
    const group = await GroupModel.findById(groupId);
    if (!group) {
      throw AppError.notFound("Không tìm thấy nhóm cần xóa", "GROUP_NOT_FOUND");
    }

    const member = await GroupMemberModel.findMember(groupId, userId);
    if (member?.role !== "owner") {
      throw AppError.forbidden("Chỉ Owner mới có quyền giải tán và xóa nhóm", "FORBIDDEN");
    }

    await GroupModel.delete(groupId);
    RealtimeService.broadcastGroupUpdate(groupId, "GROUP_DELETED", { groupId });

    return { message: "Xóa nhóm thành công", id: groupId };
  }
}

export default GroupService;
