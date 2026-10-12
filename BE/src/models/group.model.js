import { randomUUID } from "node:crypto";
import { query, withTransaction } from "../configs/db.config.js";

/**
 * GroupModel - Data Access Layer cho Thực thể Nhóm (Group Entity)
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Thực thi các thao tác đọc/ghi dữ liệu bảng public.groups
 *   - Chuẩn hóa entity trả về cho Controller/Service (toPublicGroup)
 *   - Đảm bảo tính nguyên tử (Transaction) và không nuốt lỗi DB
 */
class GroupModel {
  /**
   * Chuẩn hóa cấu trúc dữ liệu Group trả về cho client
   */
  static toPublicGroup(group) {
    if (!group) return null;

    let memberPreviews = group.member_previews || group.memberPreviews || [];
    if (typeof memberPreviews === "string") {
      try {
        memberPreviews = JSON.parse(memberPreviews);
      } catch {
        memberPreviews = [];
      }
    }
    if (!Array.isArray(memberPreviews)) {
      memberPreviews = [];
    }

    return {
      id: group.id,
      slug: group.slug,
      name: group.name,
      category: group.category || "work",
      description: group.description || "",
      icon: group.icon || "Users",
      color: group.color || "indigo",
      capacity: parseInt(group.capacity, 10) || 10,
      cohort: group.cohort || "2026",
      createdBy: group.created_by || group.createdBy || null,
      leadAdmin: group.lead_admin || group.leadAdmin || null,
      memberCount: parseInt(group.member_count ?? group.memberCount ?? 1, 10),
      memberPreviews: memberPreviews.map((m) => ({
        id: m.id,
        name: m.name || m.fullName || "Thành viên",
        avatarUrl: m.avatarUrl || m.avatar_url || null,
      })),
      userRole: group.user_role || group.userRole || "member",
      userGroupRole: group.user_group_role || group.userGroupRole || "core",
      createdAt: group.created_at || group.createdAt || new Date().toISOString(),
      updatedAt: group.updated_at || group.updatedAt || new Date().toISOString(),
    };
  }

  /**
   * Tạo nhóm mới và thêm Creator làm Owner trong cùng một Transaction (Atomic)
   */
  static async createWithLeader({
    id,
    name,
    slug,
    category = "work",
    description = "",
    icon = "Users",
    color = "indigo",
    capacity = 10,
    cohort = "2026",
  }, userId) {
    const groupId = id || randomUUID();
    const memberId = randomUUID();

    return withTransaction(async (client) => {
      const sqlGroup = `
        INSERT INTO public.groups (id, name, slug, category, description, icon, color, capacity, cohort, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *;
      `;
      const groupRes = await client.query(sqlGroup, [
        groupId,
        name,
        slug,
        category,
        description,
        icon,
        color,
        capacity,
        cohort,
        userId,
      ]);
      const createdGroup = groupRes.rows[0];

      const sqlMember = `
        INSERT INTO public.group_members (id, group_id, user_id, role, group_role, joined_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *;
      `;
      await client.query(sqlMember, [
        memberId,
        groupId,
        userId,
        "owner",
        "leadership",
      ]);

      const ownerPreviewRes = await client.query(
        `SELECT gm.user_id AS id, COALESCE(u.full_name, u.email, 'Trưởng nhóm') AS name,
                u.avatar_url AS "avatarUrl"
         FROM public.group_members gm
         LEFT JOIN public.users u ON u.id = gm.user_id
         WHERE gm.group_id = $1 AND gm.user_id = $2;`,
        [groupId, userId]
      );

      return {
        ...createdGroup,
        member_previews: ownerPreviewRes.rows,
      };
    });
  }

  /**
   * Tìm nhóm theo ID (UUID)
   */
  static async findById(id) {
    if (!id) return null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) return null;

    const sql = "SELECT * FROM public.groups WHERE id = $1 LIMIT 1;";
    const { rows } = await query(sql, [id]);
    return rows && rows[0] ? rows[0] : null;
  }

  /**
   * Tìm nhóm theo Slug
   */
  static async findBySlug(slug) {
    if (!slug) return null;

    const sql = "SELECT * FROM public.groups WHERE slug = $1 LIMIT 1;";
    const { rows } = await query(sql, [slug]);
    return rows && rows[0] ? rows[0] : null;
  }

  /**
   * Tìm nhóm theo ID hoặc Slug
   */
  static async findByIdOrSlug(identifier) {
    if (!identifier) return null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    if (isUuid) {
      const group = await this.findById(identifier);
      if (group) return group;
    }
    return this.findBySlug(identifier);
  }

  /**
   * Lấy chi tiết thông tin nhóm kèm vai trò của user, số lượng thành viên, và danh sách preview trong 1 roundtrip SQL duy nhất
   */
  static async findDetailByIdOrSlug(identifier, userId = null) {
    if (!identifier) return null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    const validUserId = userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId) ? userId : null;

    const sql = `
      WITH target_group AS (
        SELECT * FROM public.groups
        WHERE ${isUuid ? "id = $1::uuid" : "slug = $1"}
        LIMIT 1
      ),
      user_membership AS (
        SELECT gm.role, gm.group_role
        FROM public.group_members gm
        JOIN target_group tg ON gm.group_id = tg.id
        WHERE $2::uuid IS NOT NULL AND gm.user_id = $2::uuid
        LIMIT 1
      ),
      stats AS (
        SELECT COUNT(*)::int as member_count
        FROM public.group_members gm
        JOIN target_group tg ON gm.group_id = tg.id
      ),
      lead AS (
        SELECT COALESCE(u.full_name, u.email, 'Trưởng nhóm') as lead_admin
        FROM public.group_members gm
        JOIN target_group tg ON gm.group_id = tg.id
        JOIN public.users u ON gm.user_id = u.id
        WHERE gm.role IN ('owner', 'lead')
        ORDER BY CASE WHEN gm.role = 'owner' THEN 1 ELSE 2 END, gm.joined_at ASC
        LIMIT 1
      ),
      previews AS (
        SELECT COALESCE(json_agg(sub), '[]'::json) as member_previews
        FROM (
          SELECT 
            u.id,
            COALESCE(u.full_name, u.email, 'Thành viên') as name,
            u.avatar_url as "avatarUrl"
          FROM public.group_members gm
          JOIN target_group tg ON gm.group_id = tg.id
          LEFT JOIN public.users u ON gm.user_id = u.id
          ORDER BY 
            CASE WHEN gm.role = 'owner' THEN 1 WHEN gm.role = 'lead' THEN 2 ELSE 3 END,
            gm.joined_at ASC
          LIMIT 3
        ) sub
      )
      SELECT 
        tg.*,
        COALESCE(um.role, 'guest') as user_role,
        COALESCE(um.group_role, 'guest') as user_group_role,
        COALESCE(s.member_count, 1) as member_count,
        COALESCE(l.lead_admin, 'Trưởng nhóm') as lead_admin,
        p.member_previews
      FROM target_group tg
      LEFT JOIN user_membership um ON true
      LEFT JOIN stats s ON true
      LEFT JOIN lead l ON true
      LEFT JOIN previews p ON true;
    `;
    const { rows } = await query(sql, [identifier, validUserId]);
    return rows && rows[0] ? rows[0] : null;
  }

  /**
   * Lấy danh sách nhóm của một người dùng kèm vai trò (tối ưu hóa CTE duy nhất, triệt tiêu N+1 subqueries)
   */
  static async findUserGroups(userId) {
    if (!userId) return [];
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    if (!isUuid) return [];

    const sql = `
      WITH user_grps AS (
        SELECT g.*, gm.role as user_role, gm.group_role as user_group_role
        FROM public.groups g
        JOIN public.group_members gm ON g.id = gm.group_id
        WHERE gm.user_id = $1::uuid
      ),
      grp_stats AS (
        SELECT 
          gm.group_id,
          COUNT(*)::int as member_count
        FROM public.group_members gm
        WHERE gm.group_id IN (SELECT id FROM user_grps)
        GROUP BY gm.group_id
      ),
      grp_leads AS (
        SELECT DISTINCT ON (gm.group_id)
          gm.group_id,
          COALESCE(u.full_name, u.email, 'Trưởng nhóm') as lead_admin
        FROM public.group_members gm
        JOIN public.users u ON gm.user_id = u.id
        WHERE gm.group_id IN (SELECT id FROM user_grps) AND gm.role IN ('owner', 'lead')
        ORDER BY gm.group_id, CASE WHEN gm.role = 'owner' THEN 1 ELSE 2 END, gm.joined_at ASC
      ),
      ranked_members AS (
        SELECT 
          gm.group_id,
          u.id,
          COALESCE(u.full_name, u.email, 'Thành viên') as name,
          u.avatar_url as "avatarUrl",
          ROW_NUMBER() OVER (
            PARTITION BY gm.group_id 
            ORDER BY CASE WHEN gm.role = 'owner' THEN 1 WHEN gm.role = 'lead' THEN 2 ELSE 3 END, gm.joined_at ASC
          ) as rn
        FROM public.group_members gm
        LEFT JOIN public.users u ON gm.user_id = u.id
        WHERE gm.group_id IN (SELECT id FROM user_grps)
      ),
      grp_previews AS (
        SELECT 
          group_id,
          json_agg(json_build_object('id', id, 'name', name, 'avatarUrl', "avatarUrl")) as member_previews
        FROM ranked_members
        WHERE rn <= 3
        GROUP BY group_id
      )
      SELECT 
        ug.*,
        COALESCE(gs.member_count, 1) as member_count,
        COALESCE(gl.lead_admin, 'Trưởng nhóm') as lead_admin,
        COALESCE(gp.member_previews, '[]'::json) as member_previews
      FROM user_grps ug
      LEFT JOIN grp_stats gs ON gs.group_id = ug.id
      LEFT JOIN grp_leads gl ON gl.group_id = ug.id
      LEFT JOIN grp_previews gp ON gp.group_id = ug.id
      ORDER BY ug.created_at DESC;
    `;
    const { rows } = await query(sql, [userId]);
    return rows || [];
  }

  /**
   * Cập nhật thông tin nhóm (chỉ cho phép các trường hợp lệ, không nuốt lỗi DB)
   */
  static async update(id, data) {
    const ALLOWED_FIELDS = ["name", "category", "description", "capacity", "color", "icon", "cohort"];
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, val] of Object.entries(data)) {
      if (ALLOWED_FIELDS.includes(key) && val !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(val);
        idx += 1;
      }
    }

    if (fields.length === 0) return this.findById(id);

    fields.push("updated_at = NOW()");
    values.push(id);

    const sql = `
      UPDATE public.groups
      SET ${fields.join(", ")}
      WHERE id = $${idx}
      RETURNING *;
    `;
    const { rows } = await query(sql, values);
    return rows && rows[0] ? rows[0] : null;
  }

  /**
   * Xóa nhóm (không nuốt lỗi DB)
   */
  static async delete(id) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) return false;

    const sql = "DELETE FROM public.groups WHERE id = $1 RETURNING id;";
    const { rows } = await query(sql, [id]);
    return Boolean(rows && rows.length > 0);
  }
}

export default GroupModel;

