import { sendSuccess, sendCreated } from "./response.controller.js";
import GroupInvitationService from "../services/group-invitation.service.js";
import AuthService from "../services/auth.service.js";
import TokenService from "../services/token.service.js";
import UserModel from "../models/user.model.js";
import { AppError } from "./errorHandle.controller.js";
import { deviceFromRequest } from "../utils/deviceKind.js";

const invitationService = new GroupInvitationService();
const authService = new AuthService();

/**
 * GroupInvitationController - HTTP Layer tiếp nhận request và phản hồi cho Lời mời
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Tiếp nhận input HTTP từ Route
 *   - Gọi GroupInvitationService tương ứng
 *   - Gửi response chuẩn hóa qua response.controller (sendSuccess / sendCreated)
 *   - Controller action ngắn gọn 2-5 dòng code
 */
class GroupInvitationController {
  /**
   * GET /api/invitations/:token/account - Email được mời đã có tài khoản chưa (Public, cần token hợp lệ)
   */
  async getAccountStatus(req, res) {
    const result = await invitationService.getAccountStatus(req.params.token);
    return sendSuccess(res, result, "Lấy trạng thái tài khoản thành công");
  }

  /**
   * POST /api/invitations/:token/register - Tạo tài khoản cho email được mời rồi đăng nhập luôn.
   * Link lời mời chỉ được gửi tới email đó nên token đủ để xác nhận email.
   */
  async registerViaInvitation(req, res) {
    const inv = await invitationService.requireUsableInvitation(req.params.token);
    const email = (inv.email || "").trim().toLowerCase();
    if (await UserModel.findByEmail(email)) {
      throw AppError.conflict("Email này đã có tài khoản. Vui lòng đăng nhập.", "ACCOUNT_EXISTS");
    }

    const { password, fullName } = req.body;
    const result = await authService.registerInvitedUser({ email, password, fullName }, deviceFromRequest(req));
    TokenService.setAuthCookies(res, result.accessToken, result.refreshToken);
    return sendCreated(res, { user: result.user, accessToken: result.accessToken }, "Tạo tài khoản thành công");
  }

  /**
   * POST /api/groups/:id/invitations - Tạo lời mời mới và gửi email
   */
  async createInvitation(req, res) {
    const result = await invitationService.createInvitation(
      req.params.id,
      req.user.id,
      req.body
    );
    return sendCreated(res, result, "Gửi lời mời tham gia nhóm thành công");
  }

  /**
   * GET /api/groups/:id/invitations - Lấy danh sách lời mời đang chờ của nhóm
   */
  async getPendingInvitations(req, res) {
    const list = await invitationService.getPendingInvitations(
      req.params.id,
      req.user.id
    );
    return sendSuccess(res, list, "Lấy danh sách lời mời thành công");
  }

  /**
   * POST /api/groups/:id/invitations/:invitationId/resend - Gửi lại lời mời (hạn 24h mới)
   */
  async resendInvitation(req, res) {
    const result = await invitationService.resendInvitation(
      req.params.id,
      req.user.id,
      req.params.invitationId
    );
    return sendCreated(res, result, "Đã gửi lại lời mời thành công");
  }

  /**
   * DELETE /api/groups/:id/invitations/:invitationId - Thu hồi lời mời
   */
  async revokeInvitation(req, res) {
    const result = await invitationService.revokeInvitation(
      req.params.id,
      req.user.id,
      req.params.invitationId
    );
    return sendSuccess(res, result, "Đã thu hồi lời mời thành công");
  }

  /**
   * GET /api/invitations/:token - Xem trước lời mời (Public endpoint)
   */
  async getInvitationPreview(req, res) {
    const result = await invitationService.getInvitationPreview(req.params.token);
    return sendSuccess(res, result, "Lấy thông tin lời mời thành công");
  }

  /**
   * POST /api/invitations/:token/accept - Chấp nhận lời mời (Yêu cầu đăng nhập)
   */
  async acceptInvitation(req, res) {
    const result = await invitationService.acceptInvitation(
      req.params.token,
      req.user
    );
    return sendSuccess(res, result, "Tham gia nhóm thành công");
  }
}

export default GroupInvitationController;
