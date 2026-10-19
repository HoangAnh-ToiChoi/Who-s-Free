import { randomUUID } from "node:crypto";
import { query } from "../configs/db.config.js";
import { generateUniqueSlug } from "../utils/slugify.js";

class SessionModel {
  static async findAll({ groupId } = {}) {
    if (!groupId) return [];
    const sql = `
      SELECT s.*,
        (SELECT COUNT(*)::int FROM public.group_members WHERE group_id = s.group_id) AS total_members,
        (SELECT COUNT(*)::int FROM public.session_participants WHERE session_id = s.id AND status = 'responded') AS responded_count
      FROM public.sessions s
      WHERE s.group_id = $1
      ORDER BY s.created_at DESC;
    `;
    const { rows } = await query(sql, [groupId]);
    return rows || [];
  }

  static async findById(id) {
    if (!id) return null;
    const sql = `
      SELECT s.*,
        (SELECT COUNT(*)::int FROM public.group_members WHERE group_id = s.group_id) AS total_members,
        (SELECT COUNT(*)::int FROM public.session_participants WHERE session_id = s.id AND status = 'responded') AS responded_count
      FROM public.sessions s
      WHERE s.id = $1 OR s.slug = $1
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

  static async delete(id) {
    if (!id) return false;
    const sql = "DELETE FROM public.sessions WHERE id = $1 OR slug = $1 RETURNING id;";
    const { rows } = await query(sql, [id]);
    return (rows?.length ?? 0) > 0;
  }
}

export default SessionModel;
