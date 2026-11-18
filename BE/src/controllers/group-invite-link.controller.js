import { sendSuccess, sendCreated } from "./response.controller.js";
import GroupInviteLinkService from "../services/group-invite-link.service.js";

const groupInviteLinkService = new GroupInviteLinkService();

/**
 * GroupInviteLinkController - HTTP Layer tiếp nhận request và phản hồi cho Group Invite Link
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Tiếp nhận input HTTP từ Route
 *   - Gọi GroupInviteLinkService tương ứng
 *   - Phản hồi chuẩn qua response.controller
 *   - Mỗi action 2-5 dòng code
 */
class GroupInviteLinkController {
  /**
   * POST /api/groups/:id/invite-link - Tạo hoặc làm mới link mời (Lead/Owner)
   */
  async generateInviteLink(req, res) {
    const groupId = req.params.id || req.params.groupId;
    const result = await groupInviteLinkService.generateInviteLink(groupId, req.user.id);
    return sendCreated(res, result, "Tạo liên kết tham gia nhóm thành công");
  }

  /**
   * GET /api/groups/:id/invite-link - Lấy link mời hiện tại (Lead/Owner)
   */
  async getInviteLink(req, res) {
    const groupId = req.params.id || req.params.groupId;
    const result = await groupInviteLinkService.getInviteLink(groupId, req.user.id);
    return sendSuccess(res, result, "Lấy liên kết tham gia nhóm thành công");
  }

  /**
   * GET /api/join/:token - Xem trước thông tin nhóm từ link mời (Public)
   */
  async getJoinPreview(req, res) {
    const result = await groupInviteLinkService.getJoinPreview(req.params.token);
    return sendSuccess(res, result, "Lấy thông tin nhóm thành công");
  }

  /**
   * POST /api/join/:token - Tham gia nhóm từ link mời (Authenticated)
   */
  async joinGroup(req, res) {
    const result = await groupInviteLinkService.joinGroup(req.params.token, req.user);
    return sendSuccess(res, result, "Tham gia nhóm thành công");
  }
}

export default GroupInviteLinkController;
