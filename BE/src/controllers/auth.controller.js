import BaseController from "./BaseController.js";
import AuthService from "../services/auth.service.js";
import RecoveryService from "../services/recovery.service.js";
import TokenService from "../services/token.service.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getSafeReturnUrl } from "../utils/safeReturnUrl.js";

/**
 * AuthController - HTTP Layer tiếp nhận request và trả response cho module Auth
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Nhận HTTP request từ route (đã qua Zod validation middleware)
 *   - Gọi service tương ứng (AuthService hoặc RecoveryService)
 *   - Trả response chuẩn Envelope { user, accessToken } qua BaseController
 *   - Tự động bắt lỗi chuyển về Centralized Error Handler nhờ asyncHandler
 *
 * Contract theo AUTH_REFACTOR_PLAN:
 *   - Response JSON: { user, accessToken } — refreshToken KHÔNG lộ trong body
 *   - Refresh token được gửi qua HttpOnly cookie
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
   * Response: { user, accessToken } — refreshToken chỉ qua HttpOnly cookie
   */
  register = asyncHandler(async (req, res) => {
    const { email, password, fullName } = req.body;
    const result = await this.authService.register({ email, password, fullName });
    TokenService.setAuthCookies(res, result.accessToken, result.refreshToken);
    return this.sendCreated(
      res,
      { user: result.user, accessToken: result.accessToken },
      result.message
    );
  });

  /**
   * POST /api/auth/login
   * Response: { user, accessToken } — refreshToken chỉ qua HttpOnly cookie
   */
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const { accessToken, refreshToken, user } = await this.authService.login({
      email,
      password,
    });

    TokenService.setAuthCookies(res, accessToken, refreshToken);
    return this.sendSuccess(
      res,
      { user, accessToken },
      "Đăng nhập thành công"
    );
  });

  /**
   * GET /api/auth/google
   */
  googleOAuth = asyncHandler(async (req, res) => {
    const returnUrl = getSafeReturnUrl(req.query.returnUrl);
    const clientUrl = process.env.CLIENT_ORIGIN || "http://localhost:5173";
    const callbackUrl = new URL("/auth/callback", clientUrl);
    callbackUrl.searchParams.set("returnUrl", returnUrl);
    const redirectTo = callbackUrl.toString();
    const { url } = await this.authService.getGoogleOAuthUrl(redirectTo);
    return res.redirect(url);
  });

  /**
   * GET /api/auth/google/callback
   */
  googleCallback = asyncHandler(async (req, res) => {
    const { code, error: providerError } = req.query;
    const clientUrl = process.env.CLIENT_ORIGIN || "http://localhost:5173";
    const returnUrl = getSafeReturnUrl(req.cookies?.oauth_return_url);
    res.clearCookie("oauth_return_url", { path: "/" });

    if (providerError) {
      console.error("Google OAuth provider rejected the callback:", {
        error: providerError,
        description: req.query.error_description,
      });
      throw AppError.badRequest(
        "Google không hoàn tất xác thực. Hãy kiểm tra cấu hình OAuth rồi thử lại.",
        "OAUTH_PROVIDER_ERROR"
      );
    }

    if (!code) {
      console.error("Google OAuth callback did not include an authorization code", {
        queryParameters: Object.keys(req.query || {}),
      });
      throw AppError.badRequest(
        "Không nhận được mã xác thực từ Google. Hãy kiểm tra Redirect URLs trong Supabase Auth.",
        "OAUTH_CODE_MISSING"
      );
    }

    const { accessToken, refreshToken } = await this.authService.handleGoogleCallback(code);
    TokenService.setAuthCookies(res, accessToken, refreshToken);
    return res.redirect(new URL(returnUrl, clientUrl).toString());
  });

  /**
   * POST /api/auth/google/session
   * Chỉ nhận accessToken từ FE — refreshToken FE gửi lên bị bỏ qua, BE tự sinh mới
   * Response: { user, accessToken } — refreshToken chỉ qua HttpOnly cookie
   */
  googleSession = asyncHandler(async (req, res) => {
    const { accessToken } = req.body;
    // refreshToken từ FE (nếu có) bị bỏ qua — BE tự tạo refresh token mới
    const result = await this.authService.handleGoogleSession(accessToken);
    TokenService.setAuthCookies(res, result.accessToken, result.refreshToken);
    return this.sendSuccess(
      res,
      { user: result.user, accessToken: result.accessToken },
      "Đăng nhập Google thành công"
    );
  });

  /**
   * POST /api/auth/refresh
   * Đọc refresh_token từ HttpOnly cookie, trả accessToken mới trong JSON
   */
  refresh = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      TokenService.clearAuthCookies(res);
      throw AppError.unauthorized("Thiếu Refresh Token", "MISSING_REFRESH_TOKEN");
    }

    try {
      const result = await this.authService.refreshAccessToken(refreshToken);

      TokenService.setAuthCookies(res, result.accessToken, result.refreshToken);

      return this.sendSuccess(
        res,
        { accessToken: result.accessToken, user: result.user },
        "Token đã được làm mới"
      );
    } catch (err) {
      TokenService.clearAuthCookies(res);
      throw err;
    }
  });

  /**
   * POST /api/auth/logout
   */
  logout = asyncHandler(async (req, res) => {
    let userId = req.user?.id;
    if (!userId && req.cookies?.refresh_token) {
      const user = await this.authService.getUserByRefreshToken(req.cookies.refresh_token);
      userId = user?.id;
    }
    await this.authService.logout(userId);
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
