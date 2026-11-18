import { sendSuccess } from "./response.controller.js";
import RecoveryService from "../services/recovery.service.js";

const recoveryService = new RecoveryService();

/** Quên mật khẩu: gửi OTP → xác thực OTP → đặt mật khẩu mới. */
class RecoveryController {
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

export default new RecoveryController();
