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
    TokenService.setAuthCookies(res, result.accessToken, result.refreshToken);
    return this.sendCreated(res, { user: result.user, accessToken: result.accessToken }, result.message);
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
    const clientUrl = process.env.CLIENT_ORIGIN || "http://localhost:5173";

    // 1. Nếu có Authorization Code từ Google (PKCE / Code Flow)
    if (code) {
      const { accessToken, refreshToken } = await this.authService.handleGoogleCallback(code);
      TokenService.setAuthCookies(res, accessToken, refreshToken);
      return res.redirect(`${clientUrl}/`);
    }

    // 2. Nếu là Implicit / Hash Fragment Flow (trình duyệt giữ #access_token=...):
    // Trả về một trang HTML Bridge siêu nhẹ để lấy hash trên trình duyệt và điều hướng về Frontend
    return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Xác thực Google...</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;color:#334155;">
  <div style="text-align:center;">
    <div style="width:36px;height:36px;border:3px solid #e2e8f0;border-top-color:#4f46e5;border-radius:50%;margin:0 auto 16px;animation:spin 1s linear infinite;"></div>
    <p style="font-size:14px;font-weight:600;">Đang hoàn tất đăng nhập Google...</p>
  </div>
  <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  <script>
    const hash = window.location.hash;
    const target = "${clientUrl}/auth/callback" + (hash || window.location.search);
    window.location.replace(target);
  </script>
</body>
</html>`);
  });

  /**
   * POST /api/auth/google/session
   */
  googleSession = asyncHandler(async (req, res) => {
    const { accessToken, refreshToken } = req.body;
    const result = await this.authService.handleGoogleSession(accessToken, refreshToken);
    TokenService.setAuthCookies(res, result.accessToken, result.refreshToken);
    return this.sendSuccess(
      res,
      { user: result.user, accessToken: result.accessToken },
      "Đăng nhập Google thành công"
    );
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
