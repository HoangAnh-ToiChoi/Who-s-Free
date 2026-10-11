import BaseController from "./BaseController.js";
import AuthService from "../services/auth.service.js";
import RecoveryService from "../services/recovery.service.js";
import TokenService from "../services/token.service.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * AuthController - HTTP Layer tiếp nhận request và trả response cho module Auth
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Nhận HTTP request từ route
 *   - Gọi service tương ứng (AuthService hoặc RecoveryService)
 *   - Trả response chuẩn Envelope qua BaseController
 *   - Tự động bắt lỗi chuyển về Centralized Error Handler nhờ asyncHandler
 */
class AuthController extends BaseController {
  constructor() {
    super();
    this.authService = new AuthService();
    this.recoveryService = new RecoveryService();
  }

  // ─── Core Auth Handlers ──────────────────────────────────────────────────────

  /**
   * POST /api/auth/register
   */
  register = asyncHandler(async (req, res) => {
    const { email, password, fullName } = req.body;
    const result = await this.authService.register({ email, password, fullName });
    return this.sendCreated(res, result.user, result.message);
  });

  /**
   * POST /api/auth/login
   */
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const { accessToken, refreshToken, user } = await this.authService.login({
      email,
      password,
    });

    TokenService.setAuthCookies(res, accessToken, refreshToken);
    return this.sendSuccess(res, { user, accessToken }, "Đăng nhập thành công");
  });

  /**
   * GET /api/auth/google
   */
  googleOAuth = asyncHandler(async (req, res) => {
    const redirectTo = `${process.env.API_BASE_URL}/api/auth/google/callback`;
    const { url } = await this.authService.getGoogleOAuthUrl(redirectTo);
    return res.redirect(url);
  });

  /**
   * GET /api/auth/google/callback
   */
  googleCallback = asyncHandler(async (req, res) => {
    const { code } = req.query;
    const { accessToken, refreshToken } = await this.authService.handleGoogleCallback(code);

    TokenService.setAuthCookies(res, accessToken, refreshToken);

    const clientUrl = process.env.CLIENT_ORIGIN || "http://localhost:5173";
    return res.redirect(`${clientUrl}/`);
  });

  /**
   * POST /api/auth/refresh
   */
  refresh = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refresh_token;
    const { accessToken } = await this.authService.refreshAccessToken(refreshToken);

    res.cookie(
      "access_token",
      accessToken,
      TokenService.cookieOptions(TokenService.ACCESS_TOKEN_MAX_AGE)
    );

    return this.sendSuccess(res, { accessToken }, "Token đã được làm mới");
  });

  /**
   * POST /api/auth/logout
   */
  logout = asyncHandler(async (req, res) => {
    await this.authService.logout();
    TokenService.clearAuthCookies(res);
    return this.sendSuccess(res, null, "Đăng xuất thành công");
  });

  /**
   * GET /api/auth/me [PROTECTED]
   */
  getMe = asyncHandler(async (req, res) => {
    const user = await this.authService.getMe(req.user.id);
    return this.sendSuccess(res, user, "Lấy thông tin người dùng thành công");
  });

  // ─── Recovery Handlers ───────────────────────────────────────────────────────

  /**
   * POST /api/auth/forgot-password
   */
  forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await this.recoveryService.forgotPassword({ email });
    return this.sendSuccess(res, result, result.message);
  });

  /**
   * POST /api/auth/verify-otp
   */
  verifyOtp = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    const result = await this.recoveryService.verifyOtp({ email, otp });
    return this.sendSuccess(res, result, "Xác thực mã OTP thành công");
  });

  /**
   * POST /api/auth/reset-password
   */
  resetPassword = asyncHandler(async (req, res) => {
    const { email, resetToken, password, confirmPassword } = req.body;
    const result = await this.recoveryService.resetPassword({
      email,
      resetToken,
      password,
      confirmPassword,
    });
    return this.sendSuccess(res, null, result.message);
  });
}

export default AuthController;
