import { randomUUID } from "node:crypto";
import { query, withTransaction } from "../configs/db.config.js";
import { isUuid } from "../utils/uuid.js";

/** replaceUserSlots trả về giá trị này khi trưởng nhóm khác đang mở bảng Chốt lịch. */
export const BLOCKED_FINALIZING = "finalizing";

const SLOT_COLUMNS =
  "id, session_id, user_id, day_index, date_str, start_minutes, end_minutes, label, note, created_at, updated_at";

class AvailabilityModel {
  /**
   * Lấy tất cả slots của một user trong một session.
   * Trả về mảng rows — mỗi row là một slot riêng biệt.
   */
  static async findBySessionAndUser(sessionId, userId) {
    if (!sessionId || !userId) return [];
    const sql = `
      SELECT ${SLOT_COLUMNS}
      FROM public.availability_slots
      WHERE session_id = $1 AND user_id = $2
      ORDER BY day_index, start_minutes;
    `;
    const { rows } = await query(sql, [sessionId, userId]);
    return rows || [];
  }

  /**
   * Atomic replace: xóa slot cũ của user trong session rồi chèn toàn bộ slots mới bằng MỘT câu INSERT.
   * - pg_advisory_xact_lock theo (session, user): 2 lần lưu sát nhau của cùng một người chạy lần lượt,
   *   tránh DELETE/INSERT xen kẽ gây nhân đôi slot. Người khác nhau vẫn chạy song song.
   * - Khoá dòng session (FOR SHARE) và kiểm tra trạng thái ngay trong transaction để không ghi đè lên
   *   phiên vừa được chốt. Trả về null nếu phiên đã chốt, BLOCKED_FINALIZING nếu trưởng nhóm KHÁC đang chốt.
   *   Chốt lịch khoá dòng session FOR UPDATE nên hai bên chạy lần lượt, không chen nhau.
   */
  static async replaceUserSlots(sessionId, userId, slots = []) {
    return withTransaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2));", [sessionId, userId]);

      const { rows: sessionRows } = await client.query(
        `SELECT status, (finalizing_until > NOW() AND finalizing_by IS DISTINCT FROM $2) AS blocked
         FROM public.sessions WHERE id = $1 FOR SHARE;`,
        [sessionId, userId]
      );
      if (sessionRows[0]?.status === "finalized") return null;
      if (sessionRows[0]?.blocked) return BLOCKED_FINALIZING;

      await client.query(
        "DELETE FROM public.availability_slots WHERE session_id = $1 AND user_id = $2;",
        [sessionId, userId]
      );

      // Sync session_participants status so responded_count stays accurate
      const participantStatus = slots.length > 0 ? "responded" : "pending";
      const respondedAt = slots.length > 0 ? "NOW()" : "NULL";
      await client.query(
        `INSERT INTO public.session_participants (id, session_id, user_id, status, responded_at)
         VALUES ($1, $2, $3, $4, ${respondedAt})
         ON CONFLICT (session_id, user_id)
         DO UPDATE SET status = $4, responded_at = ${respondedAt};`,
        [randomUUID(), sessionId, userId, participantStatus]
      );

      if (slots.length === 0) return [];

      const { rows } = await client.query(
        `INSERT INTO public.availability_slots
           (id, session_id, user_id, day_index, date_str, start_minutes, end_minutes, label, note, created_at, updated_at)
         SELECT s.id, $1, $2, s.day_index, s.date_str, s.start_minutes, s.end_minutes, s.label, s.note, NOW(), NOW()
         FROM unnest($3::uuid[], $4::smallint[], $5::date[], $6::smallint[], $7::smallint[], $8::varchar[], $9::text[])
           AS s(id, day_index, date_str, start_minutes, end_minutes, label, note)
         RETURNING ${SLOT_COLUMNS};`,
        [
          sessionId,
          userId,
          slots.map((slot) => (slot.id && isUuid(slot.id) ? slot.id : randomUUID())),
          slots.map((slot) => slot.dayIndex),
          slots.map((slot) => slot.dateStr),
          slots.map((slot) => slot.startMinutes),
          slots.map((slot) => slot.endMinutes),
          slots.map((slot) => slot.label || "Available"),
          slots.map((slot) => slot.note || ""),
        ]
      );
      return rows.sort((x, y) => x.day_index - y.day_index || x.start_minutes - y.start_minutes);
    });
  }

  /**
   * Dữ liệu tối giản cho xuất Excel / kiểm tra khung giờ chốt (date_str trả về dạng YYYY-MM-DD).
   */
  /** @param {{ query: Function }} [db] - client của transaction đang mở (mặc định: pool) */
  static async findForSchedule(sessionId, db = { query }) {
    if (!sessionId) return [];
    const { rows } = await db.query(
      `SELECT avs.user_id, u.full_name AS member_name, avs.date_str::text AS date,
              avs.start_minutes, avs.end_minutes
       FROM public.availability_slots avs
       JOIN public.users u ON u.id = avs.user_id
       WHERE avs.session_id = $1
       ORDER BY avs.date_str, avs.start_minutes;`,
      [sessionId],
    );
    return rows || [];
  }

  /**
   * Toàn bộ slot của một session, KHÔNG join: tên/vai trò/ảnh lấy từ danh sách thành viên nhóm và ghép bằng code
   * ở service (trước đây join 3 bảng và lặp lại thông tin người dùng trên từng dòng slot). Dùng idx_avail_slots_session_user.
   */
  static async findAllBySession(sessionId) {
    if (!sessionId) return [];
    const { rows } = await query(
      `SELECT ${SLOT_COLUMNS} FROM public.availability_slots
       WHERE session_id = $1 ORDER BY user_id, day_index, start_minutes;`,
      [sessionId]
    );
    return rows || [];
  }
}

export default AvailabilityModel;
