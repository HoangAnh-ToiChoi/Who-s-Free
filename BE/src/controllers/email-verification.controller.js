import { sendSuccess } from "./response.controller.js";
import EmailVerificationService from "../services/email-verification.service.js";
import TokenService from "../services/token.service.js";
import { deviceFromRequest } from "../utils/deviceKind.js";

const emailVerificationService = new EmailVerificationService();

class EmailVerificationController {
  /** POST /api/auth/verify-email - Nhập mã đúng thì xác thực email và đăng nhập luôn (refresh token qua cookie). */
  async verify(req, res) {
    const { email, otp } = req.body;
    const result = await emailVerificationService.verify({ email, otp }, deviceFromRequest(req));
    // Email từng bị đăng ký nhiều lần: đã xác thực nhưng chưa đăng nhập, phải đặt mật khẩu mới
    if (result.passwordResetRequired) {
      return sendSuccess(res, result, "Xác thực email thành công, vui lòng đặt mật khẩu mới");
    }
    TokenService.setAuthCookies(res, result.accessToken, result.refreshToken);
    return sendSuccess(res, { user: result.user, accessToken: result.accessToken }, "Xác thực email thành công");
  }

  /** POST /api/auth/verify-email/resend - Gửi lại mã (trả lời như nhau dù email có tồn tại hay không). */
  async resend(req, res) {
    const data = await emailVerificationService.resend({ email: req.body.email }, deviceFromRequest(req));
    return sendSuccess(res, data, "Nếu email cần xác thực, mã mới đã được gửi.");
  }
}

export default new EmailVerificationController();
