import { query } from "../configs/db.config.js";

/** Số ngày giữ lại thông báo "đã chốt lịch" trong chuông. */
const FINALIZED_WINDOW_DAYS = 14;
/** Số ngày giữ lại thông báo "đã đóng vì quá hạn" trong chuông. */
const CLOSED_WINDOW_DAYS = 14;
const LIMIT = 30;

/**
 * Thông báo không có bảng riêng: suy ra từ dữ liệu có sẵn
 * (lời mời đang chờ + lịch đã chốt trong các nhóm của người dùng).
 */
class NotificationModel {
  static async getSeenAt(userId) {
    const { rows } = await query(
      "SELECT notifications_seen_at FROM public.users WHERE id = $1 LIMIT 1;",
      [userId],
    );
    return rows[0]?.notifications_seen_at || null;
  }

  static async markSeen(userId) {
    const { rows } = await query(
      "UPDATE public.users SET notifications_seen_at = NOW() WHERE id = $1 RETURNING notifications_seen_at;",
      [userId],
    );
    return rows[0]?.notifications_seen_at || null;
  }

  /** Lời mời vào nhóm đang chờ, gửi tới email của người dùng. */
  static async findPendingInvitations(email) {
    const { rows } = await query(
      `SELECT gi.id, gi.created_at, g.id AS group_id, g.name AS group_name,
              u.full_name AS inviter_name
         FROM public.group_invitations gi
         JOIN public.groups g ON g.id = gi.group_id
         LEFT JOIN public.users u ON u.id = gi.invited_by
        WHERE LOWER(gi.email) = LOWER($1)
          AND gi.status = 'pending'
          AND gi.expires_at > NOW()
        ORDER BY gi.created_at DESC
        LIMIT ${LIMIT};`,
      [email],
    );
    return rows;
  }

  /** Lịch đã chốt gần đây trong các nhóm người dùng tham gia (trừ lịch do chính họ chốt). */
  static async findRecentFinalized(userId) {
    const { rows } = await query(
      `SELECT s.id, s.slug, s.title, s.group_id, s.finalized_at, g.name AS group_name
         FROM public.sessions s
         JOIN public.group_members gm ON gm.group_id = s.group_id AND gm.user_id = $1
         JOIN public.groups g ON g.id = s.group_id
        WHERE s.status = 'finalized'
          AND s.finalized_at IS NOT NULL
          AND s.finalized_at > NOW() - INTERVAL '${FINALIZED_WINDOW_DAYS} days'
          AND s.finalized_by IS DISTINCT FROM $1
        ORDER BY s.finalized_at DESC
        LIMIT ${LIMIT};`,
      [userId],
    );
    return rows;
  }

  /**
   * Nhắc hạn cho session còn mở, chỉ cho owner/lead. Suy ra từ end_date + giờ, KHÔNG từ reminder_sent_at:
   * cột đó là dấu giành quyền gửi mail và bị trả về NULL khi gửi mail lỗi, chuông không được biến mất theo.
   * Hiện từ 20:00 VN ngày liền trước end_date (session tạo sau mốc đó không có nhắc, giống job).
   */
  static async findReminders(userId, now = new Date()) {
    const { rows } = await query(
      `SELECT s.id, s.slug, s.title, s.group_id, r.remind_at AS reminder_at, s.end_date::text AS end_date, g.name AS group_name
         FROM public.sessions s
         JOIN public.group_members gm ON gm.group_id = s.group_id AND gm.user_id = $1 AND gm.role IN ('owner', 'lead')
         JOIN public.groups g ON g.id = s.group_id
         CROSS JOIN LATERAL (
           SELECT ((s.end_date - 1) + TIME '20:00') AT TIME ZONE 'Asia/Ho_Chi_Minh' AS remind_at
         ) r
        WHERE s.status = 'active_poll'
          AND s.end_date >= (($2::timestamptz) AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
          AND $2::timestamptz >= r.remind_at
          AND s.created_at < r.remind_at
        ORDER BY r.remind_at DESC
        LIMIT ${LIMIT};`,
      [userId, now],
    );
    return rows;
  }

  /** Session tự đóng vì quá hạn trong CLOSED_WINDOW_DAYS ngày gần đây, chỉ cho owner/lead của nhóm. */
  static async findRecentClosed(userId) {
    const { rows } = await query(
      `SELECT s.id, s.slug, s.title, s.group_id, s.closed_at, g.name AS group_name
         FROM public.sessions s
         JOIN public.group_members gm ON gm.group_id = s.group_id AND gm.user_id = $1 AND gm.role IN ('owner', 'lead')
         JOIN public.groups g ON g.id = s.group_id
        WHERE s.status = 'closed'
          AND s.closed_at IS NOT NULL
          AND s.closed_at > NOW() - INTERVAL '${CLOSED_WINDOW_DAYS} days'
        ORDER BY s.closed_at DESC
        LIMIT ${LIMIT};`,
      [userId],
    );
    return rows;
  }
}

export default NotificationModel;
