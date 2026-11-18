import { sendSuccess } from "./response.controller.js";
import AuthService from "../services/auth.service.js";
import TokenService from "../services/token.service.js";
import { AppError } from "./errorHandle.controller.js";
import { getSafeReturnUrl } from "../utils/safeReturnUrl.js";
import { deviceFromRequest } from "../utils/deviceKind.js";
import { appConfig } from "../configs/app.config.js";

const authService = new AuthService();

/** Đăng nhập bằng Google (Supabase OAuth). Refresh token chỉ đi qua HttpOnly cookie. */
class GoogleAuthController {
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
}

export default new GoogleAuthController();
