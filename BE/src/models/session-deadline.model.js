import { query } from "../configs/db.config.js";

const JOB_NAME = "session-deadlines";
const TZ = "'Asia/Ho_Chi_Minh'";
// $1 luôn là "bây giờ" (timestamptz): giờ VN tính ngay trong SQL, truyền now vào để kiểm thử được mốc 19:59/20:00 và 23:59/00:00.
const TODAY_VN = `(($1::timestamptz) AT TIME ZONE ${TZ})::date`;
const REMINDER_CUTOFF = `((${TODAY_VN} + TIME '20:00') AT TIME ZONE ${TZ})`;

const CLAIM_COLUMNS = "id, group_id, slug, title, end_date::text AS end_date";

/** Truy vấn của job nhắc hạn / tự đóng session. Mọi lệnh "giành quyền" là UPDATE ... RETURNING nguyên tử. */
class SessionDeadlineModel {
  static async startRun() {
    const { rows } = await query("INSERT INTO public.job_runs (job_name) VALUES ($1) RETURNING id;", [JOB_NAME]);
    return rows[0].id;
  }

  static async finishRun(runId, { remindersSent = 0, sessionsClosed = 0, emailsFailed = 0, error = null } = {}) {
    await query(
      `UPDATE public.job_runs
       SET finished_at = NOW(), reminders_sent = $2, sessions_closed = $3, emails_failed = $4, error = $5
       WHERE id = $1;`,
      [runId, remindersSent, sessionsClosed, emailsFailed, error],
    );
  }

  /** Đóng session active_poll có end_date < hôm nay (giờ VN). Trả về số session vừa đóng. */
  static async closeOverdue(now = new Date()) {
    const { rowCount } = await query(
      `UPDATE public.sessions
       SET status = 'closed', closed_at = $1, updated_at = NOW()
       WHERE status = 'active_poll' AND end_date < ${TODAY_VN};`,
      [now],
    );
    return rowCount ?? 0;
  }

  /** Giành quyền gửi mail "đã đóng": chỉ một lần chạy nhận được mỗi session. */
  static async claimClosedNotifications(now = new Date()) {
    const { rows } = await query(
      `WITH claimed AS (
         UPDATE public.sessions SET closed_notified_at = $1
         WHERE status = 'closed' AND closed_notified_at IS NULL
         RETURNING ${CLAIM_COLUMNS}
       )
       SELECT c.id, c.group_id, c.slug, c.title, c.end_date, g.name AS group_name
       FROM claimed c JOIN public.groups g ON g.id = c.group_id;`,
      [now],
    );
    return rows;
  }

  /**
   * Giành quyền gửi mail nhắc: end_date là ngày mai (VN), đã qua 20:00 VN, và session tạo TRƯỚC mốc 20:00 hôm nay
   * (session mới tạo sau 20h không bị nhắc ngay).
   */
  static async claimReminders(now = new Date()) {
    const { rows } = await query(
      `WITH claimed AS (
         UPDATE public.sessions SET reminder_sent_at = $1
         WHERE status = 'active_poll' AND reminder_sent_at IS NULL
           AND end_date = ${TODAY_VN} + 1
           AND $1::timestamptz >= ${REMINDER_CUTOFF}
           AND created_at < ${REMINDER_CUTOFF}
         RETURNING ${CLAIM_COLUMNS}
       )
       SELECT c.id, c.group_id, c.slug, c.title, c.end_date, g.name AS group_name
       FROM claimed c JOIN public.groups g ON g.id = c.group_id;`,
      [now],
    );
    return rows;
  }

  /** Gửi mail thất bại: trả dấu về NULL để lần chạy sau thử lại. */
  static async releaseClosedNotifications(ids) {
    if (!ids?.length) return 0;
    const { rowCount } = await query(
      "UPDATE public.sessions SET closed_notified_at = NULL WHERE id = ANY($1::uuid[]) AND status = 'closed';",
      [ids],
    );
    return rowCount ?? 0;
  }

  static async releaseReminders(ids) {
    if (!ids?.length) return 0;
    const { rowCount } = await query(
      "UPDATE public.sessions SET reminder_sent_at = NULL WHERE id = ANY($1::uuid[]) AND status = 'active_poll';",
      [ids],
    );
    return rowCount ?? 0;
  }

  /** Email owner + lead của nhiều nhóm trong MỘT query (tránh N+1). Trả về Map groupId -> email[]. */
  static async findLeadEmailsByGroup(groupIds) {
    if (!groupIds?.length) return new Map();
    const { rows } = await query(
      `SELECT gm.group_id, u.email
       FROM public.group_members gm
       JOIN public.users u ON u.id = gm.user_id
       WHERE gm.group_id = ANY($1::uuid[]) AND gm.role IN ('owner', 'lead') AND u.email IS NOT NULL;`,
      [groupIds],
    );
    const byGroup = new Map();
    for (const { group_id: groupId, email } of rows) {
      byGroup.set(groupId, [...(byGroup.get(groupId) ?? []), email]);
    }
    return byGroup;
  }
}

export default SessionDeadlineModel;
