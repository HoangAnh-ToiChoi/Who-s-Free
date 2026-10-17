import BaseController from "./BaseController.js";
import GroupInviteLinkService from "../services/group-invite-link.service.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * GroupInviteLinkController - HTTP Layer tiếp nhận request và phản hồi cho Group Invite Link
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Tiếp nhận input HTTP từ Route
 *   - Gọi GroupInviteLinkService tương ứng
 *   - Phản hồi chuẩn qua BaseController
 *   - Mỗi action 2-5 dòng code, bọc bằng asyncHandler
 */
class GroupInviteLinkController extends BaseController {
  constructor() {
    super();
    this.service = new GroupInviteLinkService();
  }

  /**
   * POST /api/groups/:id/invite-link - Tạo hoặc làm mới link mời (Lead/Owner)
   */
  generateInviteLink = asyncHandler(async (req, res) => {
    const groupId = req.params.id || req.params.groupId;
    const result = await this.service.generateInviteLink(groupId, req.user.id);
    return this.sendCreated(res, result, "Tạo liên kết tham gia nhóm thành công");
  });

  /**
   * GET /api/groups/:id/invite-link - Lấy link mời hiện tại (Lead/Owner)
   */
  getInviteLink = asyncHandler(async (req, res) => {
    const groupId = req.params.id || req.params.groupId;
    const result = await this.service.getInviteLink(groupId, req.user.id);
    return this.sendSuccess(res, result, "Lấy liên kết tham gia nhóm thành công");
  });

  /**
   * GET /api/join/:token - Xem trước thông tin nhóm từ link mời (Public)
   */
  getJoinPreview = asyncHandler(async (req, res) => {
    const result = await this.service.getJoinPreview(req.params.token);
    return this.sendSuccess(res, result, "Lấy thông tin nhóm thành công");
  });

  /**
   * POST /api/join/:token - Tham gia nhóm từ link mời (Authenticated)
   */
  joinGroup = asyncHandler(async (req, res) => {
    const result = await this.service.joinGroup(req.params.token, req.user);
    return this.sendSuccess(res, result, "Tham gia nhóm thành công");
  });
}

export default GroupInviteLinkController;
