import { query } from "../configs/db.config.js";

/** Số ngày giữ lại thông báo "đã chốt lịch" trong chuông. */
const FINALIZED_WINDOW_DAYS = 14;
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
}

export default NotificationModel;
