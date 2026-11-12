import { randomUUID } from "node:crypto";
import { query, withTransaction } from "../configs/db.config.js";
import AvailabilityModel from "./availability.model.js";
import { generateUniqueSlug } from "../utils/slugify.js";
import { isUuid } from "../utils/uuid.js";

class SessionModel {
  static async findAll({ groupId } = {}) {
    // groupId phải là UUID đã resolve (service tra slug nhóm trước) để tránh 22P02
    if (!isUuid(groupId)) return [];

    const sql = `
      SELECT s.*, s.finalized_date::text AS finalized_date, s.start_date::text AS start_date, s.end_date::text AS end_date,
        (SELECT COUNT(*)::int FROM public.group_members WHERE group_id = s.group_id) AS total_members,
        (SELECT COUNT(DISTINCT user_id)::int FROM public.availability_slots WHERE session_id = s.id) AS responded_count
      FROM public.sessions s
      WHERE s.group_id = $1
      ORDER BY s.created_at DESC;
    `;
    const { rows } = await query(sql, [groupId]);
    return rows || [];
  }

  static async findById(id) {
    if (!id) return null;
    // Use the correct column to avoid 22P02 when id is a slug (non-UUID)
    const whereClause = isUuid(id) ? "s.id = $1" : "s.slug = $1";
    const sql = `
      SELECT s.*, s.finalized_date::text AS finalized_date, s.start_date::text AS start_date, s.end_date::text AS end_date,
        (SELECT COUNT(*)::int FROM public.group_members WHERE group_id = s.group_id) AS total_members,
        (SELECT COUNT(DISTINCT user_id)::int FROM public.availability_slots WHERE session_id = s.id) AS responded_count
      FROM public.sessions s
      WHERE ${whereClause}
      LIMIT 1;
    `;
    const { rows } = await query(sql, [id]);
    return rows?.[0] ?? null;
  }

  static async create({ groupId, title, description = "", tag, tagColor, dateRange, startDate = null, endDate = null, scheduledTime, location, status = "active_poll", createdBy }) {
    if (!groupId) throw new Error("groupId là bắt buộc khi tạo session");
    const id = randomUUID();
    const slug = generateUniqueSlug(title || "session");
    const refCode = `Ref #${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const sql = `
      INSERT INTO public.sessions
        (id, group_id, slug, ref_code, title, description, tag, tag_color, date_range, start_date, end_date, scheduled_time, location, status, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
      RETURNING *;
    `;
    const { rows } = await query(sql, [
      id, groupId, slug, refCode, title, description,
      tag || "CÔNG VIỆC & HỌC TẬP",
      tagColor || "primary",
      dateRange || "",
      startDate,
      endDate,
      scheduledTime || "Flexible Window",
      location || "Quán Cafe / Trực tuyến",
      status,
      createdBy || null,
    ]);
    return rows?.[0] ?? null;
  }

  /** Cập nhật các cột được phép (tên, khoảng ngày, ghi chú). `fields` dùng tên cột DB. */
  static async update(id, fields) {
    const ALLOWED = ["title", "start_date", "end_date", "date_range", "description"];
    const keys = Object.keys(fields).filter((key) => ALLOWED.includes(key));
    if (keys.length === 0) return false;
    const sets = keys.map((key, i) => `${key} = $${i + 2}`).join(", ");
    const { rowCount } = await query(
      `UPDATE public.sessions SET ${sets}, updated_at = NOW() WHERE id = $1;`,
      [id, ...keys.map((key) => fields[key])],
    );
    return rowCount > 0;
  }

  /** Số slot thành viên đã nhập nằm ngoài khoảng ngày mới (chặn thu hẹp làm mất lịch). */
  static async countSlotsOutsideWindow(id, startDate, endDate) {
    const { rows } = await query(
      "SELECT COUNT(*)::int AS n FROM public.availability_slots WHERE session_id = $1 AND (date_str < $2 OR date_str > $3);",
      [id, startDate, endDate],
    );
    return rows?.[0]?.n ?? 0;
  }

  /**
   * Chốt lịch trong MỘT transaction: khoá dòng session (FOR UPDATE) trước, rồi mới đọc lịch nhóm và kiểm tra,
   * nên không lần lưu lịch nào chen vào giữa bước kiểm tra và bước ghi (lần lưu khoá FOR SHARE → phải chờ).
   * @param {(scheduleRows: object[]) => boolean} canFinalize - kiểm tra nghiệp vụ (ở service) trên lịch mới nhất
   * @returns {Promise<"ok"|"already_finalized"|"invalid">}
   */
  static async finalizeLocked(id, { date, startMinutes, endMinutes, note, finalizedBy }, canFinalize) {
    return withTransaction(async (client) => {
      const { rows } = await client.query("SELECT status FROM public.sessions WHERE id = $1 FOR UPDATE;", [id]);
      if (!rows[0] || rows[0].status === "finalized") return "already_finalized";
      if (!canFinalize(await AvailabilityModel.findForSchedule(id, client))) return "invalid";
      await client.query(
        `UPDATE public.sessions
         SET status = 'finalized', finalized_at = NOW(), finalized_by = $2,
             finalized_date = $3, finalized_start_minutes = $4, finalized_end_minutes = $5,
             export_note = $6, finalizing_by = NULL, finalizing_until = NULL, updated_at = NOW()
         WHERE id = $1;`,
        [id, finalizedBy, date, startMinutes, endMinutes, note || null],
      );
      return "ok";
    });
  }

  /**
   * Đánh dấu trưởng nhóm đang chốt (mở bảng Chốt lịch) tới NOW() + minutes; gọi lại để gia hạn.
   * Không ghi đè khi một người KHÁC đang chốt và chưa hết hạn. Trả về true nếu đánh dấu được.
   */
  static async startFinalizing(id, userId, minutes) {
    const { rowCount } = await query(
      `UPDATE public.sessions
       SET finalizing_by = $2, finalizing_until = NOW() + make_interval(mins => $3)
       WHERE id = $1 AND status <> 'finalized'
         AND (finalizing_until IS NULL OR finalizing_until <= NOW() OR finalizing_by = $2);`,
      [id, userId, minutes],
    );
    return rowCount === 1;
  }

  /** Bỏ đánh dấu đang chốt (chỉ người đang chốt mới bỏ được). */
  static async stopFinalizing(id, userId) {
    const { rowCount } = await query(
      `UPDATE public.sessions SET finalizing_by = NULL, finalizing_until = NULL
       WHERE id = $1 AND finalizing_by = $2;`,
      [id, userId],
    );
    return rowCount === 1;
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

  /** Xoá theo UUID (service đã tra session trước). So `id = $1 OR slug = $1` lỗi 500 vì Postgres không so uuid với text. */
  static async delete(id) {
    if (!isUuid(id)) return false;
    const sql = "DELETE FROM public.sessions WHERE id = $1 RETURNING id;";
    const { rows } = await query(sql, [id]);
    return (rows?.length ?? 0) > 0;
  }
}

export default SessionModel;
