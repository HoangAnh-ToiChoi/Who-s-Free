import { sendSuccess } from "./response.controller.js";
import EmailVerificationService from "../services/email-verification.service.js";
import TokenService from "../services/token.service.js";
import { deviceFromRequest } from "../utils/deviceKind.js";

const emailVerificationService = new EmailVerificationService();

class EmailVerificationController {
  /** POST /api/auth/verify-email - Nhập mã đúng thì xác thực email và đăng nhập luôn (refresh token qua cookie). */
  async verify(req, res) {
    const { email, otp } = req.body;
    const { user, accessToken, refreshToken } = await emailVerificationService.verify({ email, otp }, deviceFromRequest(req));
    TokenService.setAuthCookies(res, accessToken, refreshToken);
    return sendSuccess(res, { user, accessToken }, "Xác thực email thành công");
  }

  /** POST /api/auth/verify-email/resend - Gửi lại mã (trả lời như nhau dù email có tồn tại hay không). */
  async resend(req, res) {
    const data = await emailVerificationService.resend({ email: req.body.email }, deviceFromRequest(req));
    return sendSuccess(res, data, "Nếu email cần xác thực, mã mới đã được gửi.");
  }
}

export default new EmailVerificationController();
