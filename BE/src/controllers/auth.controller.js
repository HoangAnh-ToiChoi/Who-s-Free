import { sendSuccess, sendCreated } from "./response.controller.js";
import AuthService from "../services/auth.service.js";
import TokenService from "../services/token.service.js";
import { AppError } from "./errorHandle.controller.js";
import { deviceFromRequest } from "../utils/deviceKind.js";

const authService = new AuthService();

/**
 * AuthController - HTTP Layer tiếp nhận request và trả response cho module Auth
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Nhận HTTP request từ route (đã qua Zod validation middleware)
 *   - Gọi AuthService (Google: google-auth.controller, quên mật khẩu: recovery.controller)
 *   - Trả response chuẩn Envelope { user, accessToken } qua response.controller
 *   - Tự động bắt lỗi chuyển về Centralized Error Handler
 *
 * Contract theo AUTH_REFACTOR_PLAN:
 *   - Response JSON: { user, accessToken } — refreshToken KHÔNG lộ trong body
 *   - Refresh token được gửi qua HttpOnly cookie
 */
class AuthController {
  /**
   * POST /api/auth/register
   * Response: { requiresVerification, email, ... } — chưa đăng nhập, phải nhập mã gửi qua email trước
   */
  async register(req, res) {
    const { email, password, fullName } = req.body;
    const result = await authService.register({ email, password, fullName }, deviceFromRequest(req));
    return sendCreated(res, result, "Đăng ký thành công, vui lòng xác thực email");
  }

  /**
   * POST /api/auth/login
   * Response: { user, accessToken } — refreshToken chỉ qua HttpOnly cookie
   */
  async login(req, res) {
    const { email, password } = req.body;
    const { accessToken, refreshToken, user } = await authService.login(
      { email, password },
      deviceFromRequest(req)
    );

    TokenService.setAuthCookies(res, accessToken, refreshToken);
    return sendSuccess(
      res,
      { user, accessToken },
      "Đăng nhập thành công"
    );
  }

  /**
   * POST /api/auth/refresh
   * Đọc refresh_token từ HttpOnly cookie, trả accessToken mới trong JSON
   */
  async refresh(req, res) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      TokenService.clearAuthCookies(res);
      throw AppError.unauthorized("Thiếu Refresh Token", "MISSING_REFRESH_TOKEN");
    }

    try {
      const result = await authService.refreshAccessToken(refreshToken);

      TokenService.setAuthCookies(res, result.accessToken, result.refreshToken);

      return sendSuccess(
        res,
        { accessToken: result.accessToken, user: result.user },
        "Token đã được làm mới"
      );
    } catch (err) {
      // Hai tab cùng làm mới: tab thua nhận INVALID_REFRESH_TOKEN. Không xoá cookie, vì nếu phản hồi này
      // về sau phản hồi của tab thắng thì sẽ xoá mất refresh token MỚI và đăng xuất cả hai tab.
      if (err?.errorCode !== "INVALID_REFRESH_TOKEN") TokenService.clearAuthCookies(res);
      throw err;
    }
  }

  /**
   * POST /api/auth/logout
   */
  async logout(req, res) {
    await authService.logout(req.cookies?.refresh_token);
    TokenService.clearAuthCookies(res);
    return sendSuccess(res, null, "Đăng xuất thành công");
  }

  /**
   * GET /api/auth/me [PROTECTED]
   */
  async getMe(req, res) {
    const user = await authService.getMe(req.user.id);
    return sendSuccess(res, user, "Lấy thông tin người dùng thành công");
  }
}

export default AuthController;
