import BaseController from "./BaseController.js";
import GroupInvitationService from "../services/group-invitation.service.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * GroupInvitationController - HTTP Layer tiếp nhận request và phản hồi cho Lời mời
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Tiếp nhận input HTTP từ Route
 *   - Gọi GroupInvitationService tương ứng
 *   - Gửi response chuẩn hóa qua BaseController (sendSuccess / sendCreated)
 *   - Controller action ngắn gọn 2-5 dòng code, chuyển lỗi tự động qua asyncHandler
 */
class GroupInvitationController extends BaseController {
  constructor() {
    super();
    this.invitationService = new GroupInvitationService();
  }

  /**
   * POST /api/groups/:id/invitations - Tạo lời mời mới và gửi email
   */
  createInvitation = asyncHandler(async (req, res) => {
    const result = await this.invitationService.createInvitation(
      req.params.id,
      req.user.id,
      req.body
    );
    return this.sendCreated(res, result, "Gửi lời mời tham gia nhóm thành công");
  });

  /**
   * GET /api/groups/:id/invitations - Lấy danh sách lời mời đang chờ của nhóm
   */
  getPendingInvitations = asyncHandler(async (req, res) => {
    const list = await this.invitationService.getPendingInvitations(
      req.params.id,
      req.user.id
    );
    return this.sendSuccess(res, list, "Lấy danh sách lời mời thành công");
  });

  /**
   * POST /api/groups/:id/invitations/:invitationId/resend - Gửi lại lời mời (hạn 24h mới)
   */
  resendInvitation = asyncHandler(async (req, res) => {
    const result = await this.invitationService.resendInvitation(
      req.params.id,
      req.user.id,
      req.params.invitationId
    );
    return this.sendCreated(res, result, "Đã gửi lại lời mời thành công");
  });

  /**
   * DELETE /api/groups/:id/invitations/:invitationId - Thu hồi lời mời
   */
  revokeInvitation = asyncHandler(async (req, res) => {
    const result = await this.invitationService.revokeInvitation(
      req.params.id,
      req.user.id,
      req.params.invitationId
    );
    return this.sendSuccess(res, result, "Đã thu hồi lời mời thành công");
  });

  /**
   * GET /api/invitations/:token - Xem trước lời mời (Public endpoint)
   */
  getInvitationPreview = asyncHandler(async (req, res) => {
    const result = await this.invitationService.getInvitationPreview(req.params.token);
    return this.sendSuccess(res, result, "Lấy thông tin lời mời thành công");
  });

  /**
   * POST /api/invitations/:token/accept - Chấp nhận lời mời (Yêu cầu đăng nhập)
   */
  acceptInvitation = asyncHandler(async (req, res) => {
    const result = await this.invitationService.acceptInvitation(
      req.params.token,
      req.user
    );
    return this.sendSuccess(res, result, "Tham gia nhóm thành công");
  });
}

export default GroupInvitationController;
