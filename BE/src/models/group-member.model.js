import { randomUUID } from "node:crypto";
import { query, withTransaction } from "../configs/db.config.js";
import AppError from "../utils/AppError.js";

/**
 * GroupMemberModel - Data Access Layer cho Bảng Quan hệ public.group_members
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Quản lý các liên kết thành viên giữa Users và Groups
 *   - Lấy danh sách thành viên kèm hồ sơ User (JOIN users)
 *   - Quản lý phân quyền Role ('owner' | 'lead' | 'member')
 *   - Ngăn chặn race condition bằng row-level locking và giao dịch nguyên tử
 */
class GroupMemberModel {
  /**
   * Chuẩn hóa cấu trúc thành viên trả về (an toàn kể cả khi profile bị thiếu hoặc null)
   */
  static toPublicMember(member) {
    if (!member) return null;

    return {
      id: member.id,
      groupId: member.group_id || member.groupId,
      userId: member.user_id || member.userId,
      role: member.role || "member",
      groupRole: member.group_role || member.groupRole || "core",
      joinedAt: member.joined_at || member.joinedAt || new Date().toISOString(),
      user: {
        id: member.user_id || member.userId,
        email: member.email || "",
        fullName: member.full_name || member.fullName || member.name || "Thành viên",
        avatarUrl: member.avatar_url || member.avatarUrl || "",
      },
    };
  }

  /**
   * Thêm thành viên vào nhóm có kiểm tra sức chứa và trùng lặp nguyên tử (Row Lock FOR UPDATE)
   */
  static async addMemberWithCapacityCheck({ groupId, userId, role = "member", groupRole = "core" }) {
    return withTransaction(async (client) => {
      // 1. Khóa hàng nhóm để serialize các thao tác ghi đồng thời vào cùng một nhóm
      const groupRes = await client.query(
        "SELECT id, capacity FROM public.groups WHERE id = $1 FOR UPDATE;",
        [groupId]
      );
      if (!groupRes.rows || groupRes.rows.length === 0) {
        throw AppError.notFound("Không tìm thấy thông tin nhóm", "GROUP_NOT_FOUND");
      }
      const capacity = parseInt(groupRes.rows[0].capacity || 10, 10);

      // 2. Đếm số lượng thành viên dưới lock
      const countRes = await client.query(
        "SELECT COUNT(*) as count FROM public.group_members WHERE group_id = $1;",
        [groupId]
      );
      const currentCount = parseInt(countRes.rows[0]?.count || 0, 10);

      if (currentCount >= capacity) {
        throw AppError.badRequest(
          `Nhóm đã đạt số lượng tối đa (${capacity} thành viên)`,
          "GROUP_CAPACITY_FULL"
        );
      }

      // 3. Kiểm tra xem đã là thành viên hay chưa
      const dupRes = await client.query(
        "SELECT id FROM public.group_members WHERE group_id = $1 AND user_id = $2 LIMIT 1;",
        [groupId, userId]
      );
      if (dupRes.rows && dupRes.rows.length > 0) {
        throw AppError.conflict("Người dùng này đã là thành viên trong nhóm", "ALREADY_MEMBER");
      }

      // 4. Thêm thành viên (Không dùng ON CONFLICT DO UPDATE để tránh ghi đè role)
      const memberId = randomUUID();
      try {
        const insertRes = await client.query(
          `INSERT INTO public.group_members (id, group_id, user_id, role, group_role, joined_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           RETURNING *;`,
          [memberId, groupId, userId, role, groupRole]
        );
        return insertRes.rows[0];
      } catch (err) {
        if (err.code === "23505") {
          throw AppError.conflict("Người dùng này đã là thành viên trong nhóm", "ALREADY_MEMBER");
        }
        throw err;
      }
    });
  }

  /**
   * Tìm thông tin thành viên cụ thể trong nhóm
   */
  static async findMember(groupId, userId) {
    if (!groupId || !userId) return null;
    const isGroupUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(groupId);
    const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    if (!isGroupUuid || !isUserUuid) return null;

    const sql = `
      SELECT gm.*, u.email, u.full_name, u.avatar_url
      FROM public.group_members gm
      LEFT JOIN public.users u ON gm.user_id = u.id
      WHERE gm.group_id = $1 AND gm.user_id = $2
      LIMIT 1;
    `;
    const { rows } = await query(sql, [groupId, userId]);
    return rows && rows[0] ? rows[0] : null;
  }

  /**
   * Lấy danh sách toàn bộ thành viên trong nhóm kèm thông tin User
   */
  static async getGroupMembers(groupId) {
    if (!groupId) return [];
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(groupId);
    if (!isUuid) return [];

    const sql = `
      SELECT gm.*, u.email, u.full_name, u.avatar_url
      FROM public.group_members gm
      LEFT JOIN public.users u ON gm.user_id = u.id
      WHERE gm.group_id = $1
      ORDER BY 
        CASE 
          WHEN gm.role = 'owner' THEN 1 
          WHEN gm.role = 'lead' THEN 2 
          ELSE 3 
        END,
        gm.joined_at ASC;
    `;
    const { rows } = await query(sql, [groupId]);
    return rows || [];
  }

  /**
   * Lấy tối đa N thành viên đại diện (avatar preview) cho nhóm
   */
  static async getMemberPreviews(groupId, limit = 3) {
    if (!groupId) return [];
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(groupId);
    if (!isUuid) return [];

    const sql = `
      SELECT 
        u.id,
        COALESCE(u.full_name, u.email, 'Thành viên') as name,
        u.avatar_url as "avatarUrl"
      FROM public.group_members gm
      JOIN public.users u ON gm.user_id = u.id
      WHERE gm.group_id = $1
      ORDER BY 
        CASE 
          WHEN gm.role = 'owner' THEN 1 
          WHEN gm.role = 'lead' THEN 2 
          ELSE 3 
        END,
        gm.joined_at ASC
      LIMIT $2;
    `;
    const { rows } = await query(sql, [groupId, limit]);
    return rows || [];
  }

  /**
   * Đếm số lượng thành viên trong nhóm
   */
  static async countMembers(groupId) {
    if (!groupId) return 0;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(groupId);
    if (!isUuid) return 0;

    const sql = "SELECT COUNT(*) as count FROM public.group_members WHERE group_id = $1;";
    const { rows } = await query(sql, [groupId]);
    return rows && rows[0] ? parseInt(rows[0].count, 10) : 0;
  }

  /**
   * Xóa một thành viên khỏi nhóm
   */
  static async removeMember(groupId, userId) {
    if (!groupId || !userId) return false;
    const isGroupUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(groupId);
    const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    if (!isGroupUuid || !isUserUuid) return false;

    const sql = "DELETE FROM public.group_members WHERE group_id = $1 AND user_id = $2 RETURNING id;";
    const { rows } = await query(sql, [groupId, userId]);
    return Boolean(rows && rows.length > 0);
  }
}

export default GroupMemberModel;

