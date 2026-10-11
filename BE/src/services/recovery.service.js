import OtpModel from "../models/otp.model.js";
import UserModel from "../models/user.model.js";
import TokenService from "./token.service.js";
import AppError from "../utils/AppError.js";

/**
 * RecoveryService - Nghiệp vụ Khôi phục Mật khẩu & Xác thực OTP 6 số
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Sinh mã ngẫu nhiên 6 chữ số, quản lý hạn dùng OTP
 *   - Xác minh OTP và cấp resetToken
 *   - Đặt lại mật khẩu mới
 */
class RecoveryService {
  static OTP_TTL_SECONDS = 600; // 10 phút
  static MAX_ATTEMPTS = 5;

  /**
   * Tạo và gửi mã OTP 6 chữ số ngẫu nhiên qua email
   * @param {{ email: string }} payload
   */
  async forgotPassword({ email }) {
    const normalizedEmail = (email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      throw AppError.badRequest("Email là bắt buộc", "EMAIL_REQUIRED");
    }

    // 1. Sinh ngẫu nhiên mã 6 chữ số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Lưu vào OtpModel
    OtpModel.save(normalizedEmail, otp, RecoveryService.OTP_TTL_SECONDS);

    console.log(`🔑 [OTP RECOVERY] Mã xác thực 6 số cho ${normalizedEmail}: ${otp}`);

    return {
      email: normalizedEmail,
      expiresInSeconds: RecoveryService.OTP_TTL_SECONDS,
      message: "Mã OTP 6 chữ số đã được tạo và gửi thành công",
    };
  }

  /**
   * Xác thực mã OTP 6 số và cấp resetToken
   * @param {{ email: string, otp: string }} payload
   */
  async verifyOtp({ email, otp }) {
    const normalizedEmail = (email || "").trim().toLowerCase();
    const cleanOtp = String(otp || "").trim();

    if (!normalizedEmail || !cleanOtp) {
      throw AppError.badRequest("Email và mã OTP là bắt buộc", "INPUT_REQUIRED");
    }

    const record = OtpModel.findByEmail(normalizedEmail);
    if (!record) {
      throw AppError.badRequest(
        "Mã OTP đã hết hạn hoặc không tìm thấy. Vui lòng gửi lại yêu cầu.",
        "OTP_EXPIRED"
      );
    }

    // Kiểm tra tính chính xác của mã
    if (record.otp !== cleanOtp) {
      const attempts = OtpModel.recordFailedAttempt(normalizedEmail);
      if (attempts >= RecoveryService.MAX_ATTEMPTS) {
        OtpModel.delete(normalizedEmail);
        throw AppError.forbidden(
          "Nhập sai mã quá 5 lần. Yêu cầu đã bị hủy vì lý do an toàn.",
          "MAX_ATTEMPTS_EXCEEDED"
        );
      }
      throw AppError.badRequest(
        `Mã OTP không chính xác. Bạn còn ${RecoveryService.MAX_ATTEMPTS - attempts} lần thử.`,
        "OTP_INCORRECT"
      );
    }

    // OTP chính xác -> Thu hồi mã đã dùng và cấp resetToken dùng 1 lần (15 phút)
    OtpModel.delete(normalizedEmail);
    const resetToken = TokenService.generateResetToken(normalizedEmail);

    return {
      email: normalizedEmail,
      resetToken,
    };
  }

  /**
   * Đặt lại mật khẩu mới với resetToken
   * @param {{ email: string, resetToken: string, password: string, confirmPassword: string }} payload
   */
  async resetPassword({ email, resetToken, password, confirmPassword }) {
    const normalizedEmail = (email || "").trim().toLowerCase();

    // 1. Kiểm tra tính hợp lệ cơ bản
    if (!password || password.length < 8) {
      throw AppError.badRequest("Mật khẩu mới phải có tối thiểu 8 ký tự", "PASSWORD_TOO_SHORT");
    }

    if (password !== confirmPassword) {
      throw AppError.badRequest(
        "Mật khẩu mới và mật khẩu xác nhận không khớp nhau",
        "PASSWORD_MISMATCH"
      );
    }

    // 2. Xác minh chữ ký resetToken
    TokenService.verifyResetToken(resetToken, normalizedEmail);

    // 3. Tìm user và cập nhật mật khẩu trong UserModel
    const user = await UserModel.findByEmail(normalizedEmail);
    if (!user) {
      throw AppError.notFound("Không tìm thấy tài khoản người dùng tương ứng", "USER_NOT_FOUND");
    }

    await UserModel.updatePassword(user.id, password);

    return {
      message: "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay bằng mật khẩu mới.",
    };
  }
}

export default RecoveryService;
