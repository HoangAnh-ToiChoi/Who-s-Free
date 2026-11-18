import { sendSuccess, sendCreated } from "./response.controller.js";
import AuthService from "../services/auth.service.js";
import RecoveryService from "../services/recovery.service.js";
import TokenService from "../services/token.service.js";
import { AppError } from "./errorHandle.controller.js";
import { getSafeReturnUrl } from "../utils/safeReturnUrl.js";
import { deviceFromRequest } from "../utils/deviceKind.js";
import { appConfig } from "../configs/app.config.js";

const authService = new AuthService();
const recoveryService = new RecoveryService();

/**
 * AuthController - HTTP Layer tiếp nhận request và trả response cho module Auth
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Nhận HTTP request từ route (đã qua Zod validation middleware)
 *   - Gọi service tương ứng (AuthService hoặc RecoveryService)
 *   - Trả response chuẩn Envelope { user, accessToken } qua response.controller
 *   - Tự động bắt lỗi chuyển về Centralized Error Handler
 *
 * Contract theo AUTH_REFACTOR_PLAN:
 *   - Response JSON: { user, accessToken } — refreshToken KHÔNG lộ trong body
 *   - Refresh token được gửi qua HttpOnly cookie
 */
class AuthController {
  // ─── Core Auth Handlers ──────────────────────────────────────────────────────

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
   * GET /api/auth/google
   */
  async googleOAuth(req, res) {
    const returnUrl = getSafeReturnUrl(req.query.returnUrl);
    const clientUrl = appConfig.clientOrigin;
    const callbackUrl = new URL("/auth/callback", clientUrl);
    callbackUrl.searchParams.set("returnUrl", returnUrl);
    const redirectTo = callbackUrl.toString();
    // Từ lời mời: gợi ý đúng email được mời và luôn hiện bảng chọn tài khoản để không tự dùng nhầm tài khoản Google khác
    const loginHint = String(req.query.loginHint || "").trim();
    const queryParams = returnUrl.startsWith("/invite/")
      ? { prompt: "select_account", ...(loginHint && { login_hint: loginHint }) }
      : undefined;
    const { url } = await authService.getGoogleOAuthUrl(redirectTo, queryParams);
    return res.redirect(url);
  }

  /**
   * GET /api/auth/google/callback
   */
  async googleCallback(req, res) {
    const { code, error: providerError } = req.query;
    const clientUrl = appConfig.clientOrigin;
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

    const { accessToken, refreshToken } = await authService.handleGoogleCallback(code, deviceFromRequest(req));
    TokenService.setAuthCookies(res, accessToken, refreshToken);
    return res.redirect(new URL(returnUrl, clientUrl).toString());
  }

  /**
   * POST /api/auth/google/session
   * Chỉ nhận accessToken từ FE — refreshToken FE gửi lên bị bỏ qua, BE tự sinh mới
   * Response: { user, accessToken } — refreshToken chỉ qua HttpOnly cookie
   */
  async googleSession(req, res) {
    const { accessToken } = req.body;
    // refreshToken từ FE (nếu có) bị bỏ qua — BE tự tạo refresh token mới
    const result = await authService.handleGoogleSession(accessToken, deviceFromRequest(req));
    TokenService.setAuthCookies(res, result.accessToken, result.refreshToken);
    return sendSuccess(
      res,
      { user: result.user, accessToken: result.accessToken },
      "Đăng nhập Google thành công"
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

  // ─── Recovery Handlers ───────────────────────────────────────────────────────

  /**
   * POST /api/auth/forgot-password
   */
  async forgotPassword(req, res) {
    const { email } = req.body;
    const result = await recoveryService.forgotPassword({ email });
    return sendSuccess(res, result, result.message);
  }

  /**
   * POST /api/auth/verify-otp
   */
  async verifyOtp(req, res) {
    const { email, otp } = req.body;
    const result = await recoveryService.verifyOtp({ email, otp });
    return sendSuccess(res, result, "Xác thực mã OTP thành công");
  }

  /**
   * POST /api/auth/reset-password
   */
  async resetPassword(req, res) {
    const { email, resetToken, password, confirmPassword } = req.body;
    const result = await recoveryService.resetPassword({
      email,
      resetToken,
      password,
      confirmPassword,
    });
    return sendSuccess(res, null, result.message);
  }
}

export default AuthController;
