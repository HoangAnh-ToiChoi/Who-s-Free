import BaseController from "./BaseController.js";
import EmailVerificationService from "../services/email-verification.service.js";
import TokenService from "../services/token.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import { deviceFromRequest } from "../utils/deviceKind.js";

class EmailVerificationController extends BaseController {
  service = new EmailVerificationService();

  /** POST /api/auth/verify-email - Nhập mã đúng thì xác thực email và đăng nhập luôn (refresh token qua cookie). */
  verify = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    const { user, accessToken, refreshToken } = await this.service.verify({ email, otp }, deviceFromRequest(req));
    TokenService.setAuthCookies(res, accessToken, refreshToken);
    return this.sendSuccess(res, { user, accessToken }, "Xác thực email thành công");
  });

  /** POST /api/auth/verify-email/resend - Gửi lại mã (trả lời như nhau dù email có tồn tại hay không). */
  resend = asyncHandler(async (req, res) => {
    const data = await this.service.resend({ email: req.body.email }, deviceFromRequest(req));
    return this.sendSuccess(res, data, "Nếu email cần xác thực, mã mới đã được gửi.");
  });
}

export default new EmailVerificationController();
