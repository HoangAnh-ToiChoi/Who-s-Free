import { query } from "../configs/db.config.js";

/** Nhật ký + mã OTP xác thực email (public.email_verifications). Mỗi lần gửi mã là một dòng. */
class EmailVerificationModel {
  /** Mốc gửi gần nhất và số lần gửi trong 1 giờ qua của một email (cho giới hạn gửi lại). */
  static async sendStats(email) {
    const { rows } = await query(
      `SELECT MAX(sent_at) AS last_sent_at,
              COUNT(*) FILTER (WHERE sent_at > NOW() - INTERVAL '1 hour')::int AS sent_last_hour
       FROM public.email_verifications
       WHERE email = $1 AND reason IN ('register', 'login', 'resend');`,
      [email]
    );
    const row = rows[0] || {};
    return { lastSentAt: row.last_sent_at ? new Date(row.last_sent_at) : null, sentLastHour: row.sent_last_hour || 0 };
  }

  /** Mã cũ còn chờ của email này không dùng được nữa khi đã gửi mã mới. */
  static async supersedePending(email) {
    await query(
      `UPDATE public.email_verifications SET status = 'superseded', updated_at = NOW()
       WHERE email = $1 AND status = 'pending';`,
      [email]
    );
  }

  static async create({ userId, email, otpHash = null, reason, status = "pending", ip, userAgent, expiresAt = null }) {
    const { rows } = await query(
      `INSERT INTO public.email_verifications
         (user_id, email, otp_hash, reason, status, ip, user_agent, expires_at, verified_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $5 = 'verified' THEN NOW() END)
       RETURNING id;`,
      [userId, email, otpHash, reason, status, ip || null, userAgent || null, expiresAt]
    );
    return rows[0].id;
  }

  static async setStatus(id, status) {
    await query(
      `UPDATE public.email_verifications
       SET status = $2, updated_at = NOW(), verified_at = CASE WHEN $2 = 'verified' THEN NOW() ELSE verified_at END
       WHERE id = $1;`,
      [id, status]
    );
  }

  /** Mã đang chờ mới nhất của email (null nếu không có). */
  static async findLatestPending(email) {
    const { rows } = await query(
      `SELECT id, user_id, email, otp_hash, attempts, expires_at
       FROM public.email_verifications
       WHERE email = $1 AND status = 'pending'
       ORDER BY sent_at DESC LIMIT 1;`,
      [email]
    );
    const row = rows[0];
    return row
      ? { id: row.id, userId: row.user_id, email: row.email, otpHash: row.otp_hash, attempts: row.attempts, expiresAt: new Date(row.expires_at) }
      : null;
  }

  /** Tăng số lần nhập sai (nguyên tử), trả về số lần sau khi tăng. */
  static async recordFailedAttempt(id) {
    const { rows } = await query(
      `UPDATE public.email_verifications SET attempts = attempts + 1, updated_at = NOW()
       WHERE id = $1 RETURNING attempts;`,
      [id]
    );
    return rows[0]?.attempts ?? 0;
  }

  /** Tài khoản tự đăng ký nhưng chưa từng xác thực: có dòng gửi mã mà không có dòng verified nào. */
  static async isUnverifiedSignup(userId) {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'verified')::int AS verified
       FROM public.email_verifications WHERE user_id = $1;`,
      [userId]
    );
    const { total = 0, verified = 0 } = rows[0] || {};
    return total > 0 && verified === 0;
  }
}

export default EmailVerificationModel;
