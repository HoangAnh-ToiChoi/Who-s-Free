import { randomUUID } from "node:crypto";
import { query, withTransaction } from "../configs/db.config.js";
import { isUuid } from "../utils/uuid.js";

class AvailabilityModel {
  /**
   * Lấy tất cả slots của một user trong một session.
   * Trả về mảng rows — mỗi row là một slot riêng biệt.
   */
  static async findBySessionAndUser(sessionId, userId) {
    if (!sessionId || !userId) return [];
    const sql = `
      SELECT id, session_id, user_id, day_index, date_str, start_minutes, end_minutes, label, note, created_at, updated_at
      FROM public.availability_slots
      WHERE session_id = $1 AND user_id = $2
      ORDER BY day_index, start_minutes;
    `;
    const { rows } = await query(sql, [sessionId, userId]);
    return rows || [];
  }

  /**
   * Atomic replace: xóa slot cũ của user trong session, chèn mảng slots mới.
   * Dùng transaction để đảm bảo tính nguyên tử.
   */
  static async replaceUserSlots(sessionId, userId, slots = []) {
    return withTransaction(async (client) => {
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

      const inserted = [];
      for (const slot of slots) {
        const id = (slot.id && isUuid(slot.id)) ? slot.id : randomUUID();
        const { rows } = await client.query(
          `INSERT INTO public.availability_slots
             (id, session_id, user_id, day_index, date_str, start_minutes, end_minutes, label, note, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
           RETURNING *;`,
          [
            id, sessionId, userId,
            slot.dayIndex, slot.dateStr,
            slot.startMinutes, slot.endMinutes,
            slot.label || "Available",
            slot.note || "",
          ]
        );
        inserted.push(rows[0]);
      }
      return inserted;
    });
  }

  /**
   * Lấy toàn bộ slots của tất cả thành viên trong session,
   * JOIN với users và group_members để lấy tên, role, avatar.
   * Service sẽ group lại theo user_id.
   */
  static async findAllBySession(sessionId) {
    if (!sessionId) return [];
    const sql = `
      SELECT
        avs.*,
        gm.role,
        gm.group_role,
        u.full_name AS member_name,
        u.avatar_url
      FROM public.availability_slots avs
      JOIN public.sessions s ON s.id = avs.session_id
      JOIN public.users u ON u.id = avs.user_id
      JOIN public.group_members gm ON gm.user_id = avs.user_id AND gm.group_id = s.group_id
      WHERE avs.session_id = $1
      ORDER BY avs.user_id, avs.day_index, avs.start_minutes;
    `;
    const { rows } = await query(sql, [sessionId]);
    return rows || [];
  }
}

export default AvailabilityModel;
