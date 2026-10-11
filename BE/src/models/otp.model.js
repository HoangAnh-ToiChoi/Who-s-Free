/**
 * OtpModel - Data Access Layer cho Thực thể Mã Xác Thực OTP
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Quản lý trạng thái lưu trữ, kiểm tra thời hạn và giới hạn số lần thử của mã OTP
 */
class OtpModel {
  // Kho lưu trữ tạm thời OTP trong bộ nhớ (email -> { otp, expiresAt, attempts })
  static store = new Map();

  /**
   * Lưu hoặc cập nhật mã OTP mới cho email
   * @param {string} email
   * @param {string} otp - Mã gồm 6 chữ số
   * @param {number} ttlSeconds - Thời hạn hiệu lực tính theo giây (mặc định 600s = 10 phút)
   */
  static save(email, otp, ttlSeconds = 600) {
    const normalized = (email || "").trim().toLowerCase();
    const expiresAt = Date.now() + ttlSeconds * 1000;

    const record = {
      email: normalized,
      otp: String(otp).trim(),
      expiresAt,
      attempts: 0,
      createdAt: Date.now(),
    };

    this.store.set(normalized, record);
    return record;
  }

  /**
   * Lấy thông tin bản ghi OTP của một email
   * @param {string} email
   * @returns {object|null}
   */
  static findByEmail(email) {
    const normalized = (email || "").trim().toLowerCase();
    const record = this.store.get(normalized);
    if (!record) return null;

    // Tự động xóa nếu mã đã hết hạn
    if (Date.now() > record.expiresAt) {
      this.delete(normalized);
      return null;
    }

    return record;
  }

  /**
   * Ghi nhận 1 lần nhập sai mã OTP
   * @param {string} email
   * @returns {number} Số lần đã nhập sai
   */
  static recordFailedAttempt(email) {
    const normalized = (email || "").trim().toLowerCase();
    const record = this.store.get(normalized);
    if (!record) return 0;

    record.attempts += 1;
    return record.attempts;
  }

  /**
   * Xóa bản ghi OTP khi đã sử dụng hoặc bị hủy
   * @param {string} email
   */
  static delete(email) {
    const normalized = (email || "").trim().toLowerCase();
    this.store.delete(normalized);
  }
}

export default OtpModel;
