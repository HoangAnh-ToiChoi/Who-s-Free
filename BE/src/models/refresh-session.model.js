import crypto from "node:crypto";
import { query } from "../configs/db.config.js";

/** Hạn của refresh token, tính từ lần dùng cuối (mỗi lần làm mới token thì gia hạn lại). */
export const REFRESH_TTL_DAYS = 15;

const USER_COLUMNS = "u.id, u.email, u.full_name, u.avatar_url, u.created_at";

/**
 * RefreshSessionModel - Mỗi dòng refresh_sessions là một thiết bị đang đăng nhập.
 * Chỉ lưu SHA-256 của token. Ràng buộc UNIQUE (user_id, device_kind): mỗi tài khoản 1 phiên / loại thiết bị.
 */
class RefreshSessionModel {
  static hashToken(token) {
    return crypto.createHash("sha256").update(String(token)).digest("hex");
  }

  /**
   * Đăng nhập trên một thiết bị: tạo phiên mới, hoặc THAY phiên đang có của cùng loại thiết bị.
   * Khi thay, id phiên cũng đổi nên access token của thiết bị cũ (mang id cũ) hết hiệu lực theo.
   * @returns {Promise<{ id: string, replacedId: string|null }>}
   */
  static async upsertForDevice(userId, { kind, userAgent }, token) {
    const { rows } = await query(
      `WITH old AS (
         SELECT id FROM public.refresh_sessions WHERE user_id = $1 AND device_kind = $2
       )
       INSERT INTO public.refresh_sessions (user_id, device_kind, token_hash, user_agent)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, device_kind) DO UPDATE
         SET id = gen_random_uuid(), token_hash = EXCLUDED.token_hash, user_agent = EXCLUDED.user_agent,
             created_at = NOW(), last_used_at = NOW()
       RETURNING id, (SELECT id FROM old) AS replaced_id;`,
      [userId, kind, this.hashToken(token), userAgent || null]
    );
    return { id: rows[0].id, replacedId: rows[0].replaced_id ?? null };
  }

  /** Phiên + người dùng theo refresh token; null nếu không có (sai token, đã bị thay hoặc đã đăng xuất). */
  static async findByToken(token) {
    const { rows } = await query(
      `SELECT s.id AS session_id, s.last_used_at, ${USER_COLUMNS}
       FROM public.refresh_sessions s JOIN public.users u ON u.id = s.user_id
       WHERE s.token_hash = $1;`,
      [this.hashToken(token)]
    );
    return rows[0] ?? null;
  }

  /**
   * Đổi token (Refresh Token Rotation) bằng compare-and-swap: chỉ đổi khi token cũ vẫn còn là token hiện tại,
   * nên một token chỉ dùng được một lần. Gia hạn last_used_at. Trả về true nếu đổi được.
   */
  static async rotate(sessionId, oldToken, newToken) {
    const { rowCount } = await query(
      `UPDATE public.refresh_sessions SET token_hash = $3, last_used_at = NOW()
       WHERE id = $1 AND token_hash = $2;`,
      [sessionId, this.hashToken(oldToken), this.hashToken(newToken)]
    );
    return rowCount === 1;
  }

  static async exists(sessionId) {
    const { rowCount } = await query("SELECT 1 FROM public.refresh_sessions WHERE id = $1;", [sessionId]);
    return rowCount === 1;
  }

  /** Xoá phiên theo id; trả về id đã xoá (hoặc null). */
  static async deleteById(sessionId) {
    const { rows } = await query("DELETE FROM public.refresh_sessions WHERE id = $1 RETURNING id;", [sessionId]);
    return rows[0]?.id ?? null;
  }

  /** Đăng xuất bằng refresh token: xoá đúng phiên của thiết bị đó. */
  static async deleteByToken(token) {
    const { rows } = await query("DELETE FROM public.refresh_sessions WHERE token_hash = $1 RETURNING id;", [
      this.hashToken(token),
    ]);
    return rows[0]?.id ?? null;
  }

  /** Đăng xuất mọi thiết bị (vd sau khi đặt lại mật khẩu); trả về các id đã xoá. */
  static async deleteAllForUser(userId) {
    const { rows } = await query("DELETE FROM public.refresh_sessions WHERE user_id = $1 RETURNING id;", [userId]);
    return rows.map((r) => r.id);
  }

  /** Dọn các phiên đã quá hạn của một người dùng (gọi khi người đó đăng nhập). */
  static async deleteExpiredForUser(userId) {
    await query(
      `DELETE FROM public.refresh_sessions
       WHERE user_id = $1 AND last_used_at < NOW() - make_interval(days => $2);`,
      [userId, REFRESH_TTL_DAYS]
    );
  }
}

export default RefreshSessionModel;
