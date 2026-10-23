import crypto from "node:crypto";
import { query } from "../configs/db.config.js";

/**
 * OtpModel - Data Access Layer cho Thực thể Mã Xác Thực OTP
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Quản lý trạng thái lưu trữ, kiểm tra thời hạn và giới hạn số lần thử của mã OTP
 *
 * Lưu trong bảng public.password_reset_otps (OTP chỉ lưu dạng HMAC) để sống sót qua
 * restart/ngủ của server. Môi trường test dùng Map trong bộ nhớ.
 */
class OtpModel {
  // Kho lưu trữ OTP trong bộ nhớ cho môi trường test (email -> { otp, expiresAt, attempts })
  static store = new Map();

  static #useMemory() {
    return process.env.NODE_ENV === "test";
  }

  static #normalize(email) {
    return (email || "").trim().toLowerCase();
  }

  static #hash(email, otp) {
    const secret = process.env.JWT_SECRET || "otp-fallback-secret";
    return crypto.createHmac("sha256", secret).update(`${email}:${String(otp).trim()}`).digest("hex");
  }

  /**
   * Lưu hoặc cập nhật mã OTP mới cho email (đặt lại số lần thử về 0)
   * @param {string} email
   * @param {string} otp - Mã gồm 6 chữ số
   * @param {number} ttlSeconds - Thời hạn hiệu lực tính theo giây (mặc định 600s = 10 phút)
   */
  static async save(email, otp, ttlSeconds = 600) {
    const normalized = this.#normalize(email);
    const expiresAt = Date.now() + ttlSeconds * 1000;

    if (this.#useMemory()) {
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

    // Dọn các OTP đã hết hạn để bảng không phình ra
    await query("DELETE FROM public.password_reset_otps WHERE expires_at < NOW();");
    await query(
      `INSERT INTO public.password_reset_otps (email, otp_hash, attempts, expires_at, created_at)
       VALUES ($1, $2, 0, $3, NOW())
       ON CONFLICT (email) DO UPDATE
       SET otp_hash = EXCLUDED.otp_hash, attempts = 0, expires_at = EXCLUDED.expires_at, created_at = NOW();`,
      [normalized, this.#hash(normalized, otp), new Date(expiresAt)],
    );
    return { email: normalized, expiresAt, attempts: 0 };
  }

  /**
   * Lấy thông tin bản ghi OTP của một email (tự xóa nếu đã hết hạn)
   * @param {string} email
   * @returns {Promise<object|null>}
   */
  static async findByEmail(email) {
    const normalized = this.#normalize(email);

    if (this.#useMemory()) {
      const record = this.store.get(normalized);
      if (!record) return null;
      if (Date.now() > record.expiresAt) {
        this.store.delete(normalized);
        return null;
      }
      return record;
    }

    const { rows } = await query(
      "SELECT email, otp_hash, attempts, expires_at FROM public.password_reset_otps WHERE email = $1;",
      [normalized],
    );
    const row = rows?.[0];
    if (!row) return null;

    const expiresAt = new Date(row.expires_at).getTime();
    if (Date.now() > expiresAt) {
      await this.delete(normalized);
      return null;
    }
    return { email: row.email, otpHash: row.otp_hash, attempts: row.attempts, expiresAt };
  }

  /**
   * So khớp mã người dùng nhập với bản ghi (bản ghi DB so HMAC, bản ghi test so trực tiếp)
   * @param {object} record - Kết quả của findByEmail
   * @param {string} otp
   * @returns {boolean}
   */
  static matches(record, otp) {
    const candidate = String(otp ?? "").trim();
    if (record.otpHash) {
      const expected = Buffer.from(record.otpHash, "hex");
      const actual = Buffer.from(this.#hash(record.email, candidate), "hex");
      return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
    }
    return record.otp === candidate;
  }

  /**
   * Ghi nhận 1 lần nhập sai mã OTP (nguyên tử trong DB)
   * @param {string} email
   * @returns {Promise<number>} Số lần đã nhập sai
   */
  static async recordFailedAttempt(email) {
    const normalized = this.#normalize(email);

    if (this.#useMemory()) {
      const record = this.store.get(normalized);
      if (!record) return 0;
      record.attempts += 1;
      return record.attempts;
    }

    const { rows } = await query(
      "UPDATE public.password_reset_otps SET attempts = attempts + 1 WHERE email = $1 RETURNING attempts;",
      [normalized],
    );
    return rows?.[0]?.attempts ?? 0;
  }

  /**
   * Xóa bản ghi OTP khi đã sử dụng hoặc bị hủy
   * @param {string} email
   */
  static async delete(email) {
    const normalized = this.#normalize(email);
    if (this.#useMemory()) {
      this.store.delete(normalized);
      return;
    }
    await query("DELETE FROM public.password_reset_otps WHERE email = $1;", [normalized]);
  }

  /**
   * Xóa toàn bộ bản ghi OTP trong bộ nhớ (dùng cho cleanup và testing)
   */
  static clear() {
    this.store.clear();
  }
}

export default OtpModel;
