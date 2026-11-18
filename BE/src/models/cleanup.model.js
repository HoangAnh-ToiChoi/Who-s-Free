import { query } from "../configs/db.config.js";

/** Truy vấn dọn dữ liệu cho các job định kỳ (OTP cũ, tài khoản chưa xác thực). */
class CleanupModel {
  /** Xoá OTP quên mật khẩu đã hết hạn quá `days` ngày. Trả về số dòng đã xoá. */
  static async deleteOldPasswordResetOtps(days) {
    const { rowCount } = await query(
      "DELETE FROM public.password_reset_otps WHERE expires_at < NOW() - make_interval(days => $1);",
      [days]
    );
    return rowCount;
  }

  /**
   * Mã xác thực email gửi quá `days` ngày: xoá mã băm (không ai dùng lại được) nhưng GIỮ dòng để truy vết.
   * Mã còn "pending" thì chuyển "expired". Trả về số dòng đã xử lý.
   */
  static async scrubOldEmailVerificationCodes(days) {
    const { rowCount } = await query(
      `UPDATE public.email_verifications
       SET otp_hash = NULL,
           status = CASE WHEN status = 'pending' THEN 'expired' ELSE status END,
           updated_at = NOW()
       WHERE otp_hash IS NOT NULL AND sent_at < NOW() - make_interval(days => $1);`,
      [days]
    );
    return rowCount;
  }

  /**
   * Tài khoản tự đăng ký (có dòng gửi mã) mà chưa từng xác thực, tạo quá `days` ngày.
   * Tài khoản Google / lời mời không có dòng gửi mã nên không bao giờ lọt vào đây.
   */
  static async findStaleUnverifiedAccounts(days) {
    const { rows } = await query(
      `SELECT u.id, u.email
       FROM auth.users u
       WHERE u.email_confirmed_at IS NULL
         AND u.created_at < NOW() - make_interval(days => $1)
         AND EXISTS (SELECT 1 FROM public.email_verifications v WHERE v.user_id = u.id)
         AND NOT EXISTS (SELECT 1 FROM public.email_verifications v WHERE v.user_id = u.id AND v.status = 'verified');`,
      [days]
    );
    return rows;
  }

  /** Xoá hồ sơ public.users (tài khoản chưa xác thực không có nhóm hay lịch nào). */
  static async deletePublicUser(userId) {
    await query("DELETE FROM public.users WHERE id = $1;", [userId]);
  }
}

export default CleanupModel;
