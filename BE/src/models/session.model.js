import { randomUUID } from "node:crypto";
import { query } from "../configs/db.config.js";
import { generateUniqueSlug } from "../utils/slugify.js";
import { isUuid } from "../utils/uuid.js";

class SessionModel {
  static async findAll({ groupId } = {}) {
    if (!groupId) return [];

    // Resolve slug → UUID to avoid 22P02 on the UUID group_id column
    let resolvedGroupId = groupId;
    if (!isUuid(groupId)) {
      const { rows: gRows } = await query(
        "SELECT id FROM public.groups WHERE slug = $1 LIMIT 1;",
        [groupId]
      );
      if (!gRows?.length) return [];
      resolvedGroupId = gRows[0].id;
    }

    const sql = `
      SELECT s.*, s.finalized_date::text AS finalized_date,
        (SELECT COUNT(*)::int FROM public.group_members WHERE group_id = s.group_id) AS total_members,
        (SELECT COUNT(DISTINCT user_id)::int FROM public.availability_slots WHERE session_id = s.id) AS responded_count
      FROM public.sessions s
      WHERE s.group_id = $1
      ORDER BY s.created_at DESC;
    `;
    const { rows } = await query(sql, [resolvedGroupId]);
    return rows || [];
  }

  static async findById(id) {
    if (!id) return null;
    // Use the correct column to avoid 22P02 when id is a slug (non-UUID)
    const whereClause = isUuid(id) ? "s.id = $1" : "s.slug = $1";
    const sql = `
      SELECT s.*, s.finalized_date::text AS finalized_date,
        (SELECT COUNT(*)::int FROM public.group_members WHERE group_id = s.group_id) AS total_members,
        (SELECT COUNT(DISTINCT user_id)::int FROM public.availability_slots WHERE session_id = s.id) AS responded_count
      FROM public.sessions s
      WHERE ${whereClause}
      LIMIT 1;
    `;
    const { rows } = await query(sql, [id]);
    return rows?.[0] ?? null;
  }

  static async create({ groupId, title, description = "", tag, tagColor, dateRange, scheduledTime, location, status = "active_poll", createdBy }) {
    if (!groupId) throw new Error("groupId là bắt buộc khi tạo session");
    const id = randomUUID();
    const slug = generateUniqueSlug(title || "session");
    const refCode = `Ref #${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const sql = `
      INSERT INTO public.sessions
        (id, group_id, slug, ref_code, title, description, tag, tag_color, date_range, scheduled_time, location, status, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *;
    `;
    const { rows } = await query(sql, [
      id, groupId, slug, refCode, title, description,
      tag || "CÔNG VIỆC & HỌC TẬP",
      tagColor || "primary",
      dateRange || "",
      scheduledTime || "Flexible Window",
      location || "Quán Cafe / Trực tuyến",
      status,
      createdBy || null,
    ]);
    return rows?.[0] ?? null;
  }

  /** Đánh dấu session đã chốt với khung giờ được chọn (chỉ khi chưa chốt). */
  static async finalize(id, { date, startMinutes, endMinutes, note, finalizedBy }) {
    const { rows } = await query(
      `UPDATE public.sessions
       SET status = 'finalized', finalized_at = NOW(), finalized_by = $2,
           finalized_date = $3, finalized_start_minutes = $4, finalized_end_minutes = $5,
           export_note = $6, updated_at = NOW()
       WHERE id = $1 AND status <> 'finalized'
       RETURNING id;`,
      [id, finalizedBy, date, startMinutes, endMinutes, note || null],
    );
    return (rows?.length ?? 0) > 0;
  }

  static async unfinalize(id) {
    const { rows } = await query(
      `UPDATE public.sessions
       SET status = 'active_poll', finalized_at = NULL, finalized_by = NULL,
           finalized_date = NULL, finalized_start_minutes = NULL, finalized_end_minutes = NULL,
           updated_at = NOW()
       WHERE id = $1 AND status = 'finalized'
       RETURNING id;`,
      [id],
    );
    return (rows?.length ?? 0) > 0;
  }

  /** Tên + email của toàn bộ thành viên nhóm (để gửi thông báo chốt lịch). */
  static async findGroupContacts(groupId) {
    const { rows } = await query(
      `SELECT u.id, u.email, u.full_name
       FROM public.group_members gm
       JOIN public.users u ON u.id = gm.user_id
       WHERE gm.group_id = $1 AND u.email IS NOT NULL;`,
      [groupId],
    );
    return rows || [];
  }

  static async delete(id) {
    if (!id) return false;
    const sql = "DELETE FROM public.sessions WHERE id = $1 OR slug = $1 RETURNING id;";
    const { rows } = await query(sql, [id]);
    return (rows?.length ?? 0) > 0;
  }
}

export default SessionModel;
