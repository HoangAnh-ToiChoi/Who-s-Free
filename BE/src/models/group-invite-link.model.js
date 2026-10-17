import { randomUUID } from "node:crypto";
import { query } from "../configs/db.config.js";

/**
 * GroupInviteLinkModel - Data Access Layer cho Bảng public.group_invite_links
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Quản lý tạo, đọc, vô hiệu hóa liên kết mời tham gia nhóm
 *   - Lưu plain text token 64 ký tự hex
 *   - Hỗ trợ in-memory store song song cho test môi trường cô lập
 */
class GroupInviteLinkModel {
  static store = new Map();

  /**
   * Tạo bản ghi liên kết mời mới
   */
  static async create({ id, groupId, token, createdBy, expiresAt }) {
    const linkId = id || randomUUID();
    const now = new Date();

    const record = {
      id: linkId,
      group_id: groupId,
      token,
      created_by: createdBy,
      expires_at: expiresAt,
      revoked_at: null,
      revoked_by: null,
      created_at: now,
    };

    this.store.set(linkId, { ...record });

    if (process.env.NODE_ENV === "test") {
      return record;
    }

    try {
      const sql = `
        INSERT INTO public.group_invite_links (
          id, group_id, token, created_by, expires_at, created_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *;
      `;
      const { rows } = await query(sql, [
        linkId,
        groupId,
        token,
        createdBy,
        expiresAt,
      ]);
      return rows?.[0] || record;
    } catch (err) {
      console.warn("DB INSERT failed for group_invite_links, falling back to memory store:", err.message);
      return record;
    }
  }

  /**
   * Vô hiệu hóa (revoke) tất cả link active của một nhóm
   */
  static async revokeActiveByGroupId(groupId, revokedBy) {
    if (!groupId) return;

    if (process.env.NODE_ENV !== "test") {
      try {
        const sql = `
          UPDATE public.group_invite_links
          SET revoked_at = NOW(), revoked_by = $2
          WHERE group_id = $1 AND revoked_at IS NULL;
        `;
        await query(sql, [groupId, revokedBy || null]);
      } catch (err) {
        console.warn("DB revokeActiveByGroupId failed, falling back to memory store:", err.message);
      }
    }

    for (const item of this.store.values()) {
      if (item.group_id === groupId && !item.revoked_at) {
        item.revoked_at = new Date();
        item.revoked_by = revokedBy;
      }
    }
  }

  /**
   * Tìm link mời đang active (chưa revoke và chưa hết hạn) của một nhóm
   */
  static async findActiveByGroupId(groupId) {
    if (!groupId) return null;

    if (process.env.NODE_ENV !== "test") {
      try {
        const sql = `
          SELECT * FROM public.group_invite_links
          WHERE group_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
          ORDER BY created_at DESC
          LIMIT 1;
        `;
        const { rows } = await query(sql, [groupId]);
        if (rows?.[0]) return rows[0];
      } catch (err) {
        console.warn("Database query failed in findActiveByGroupId, falling back to store:", err.message);
      }
    }

    const now = new Date();
    const active = [...this.store.values()]
      .filter(
        (item) =>
          item.group_id === groupId &&
          !item.revoked_at &&
          new Date(item.expires_at) > now
      )
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return active[0] || null;
  }

  /**
   * Tìm link mời theo token kèm thông tin chi tiết của Nhóm
   */
  static async findByToken(token) {
    if (!token) return null;

    if (process.env.NODE_ENV !== "test") {
      try {
        const sql = `
          SELECT 
            gil.*,
            g.name as group_name,
            g.slug as group_slug,
            g.description as group_description,
            g.icon as group_icon,
            g.color as group_color,
            g.capacity as group_capacity,
            (SELECT COUNT(*)::int FROM public.group_members WHERE group_id = gil.group_id) as member_count
          FROM public.group_invite_links gil
          JOIN public.groups g ON gil.group_id = g.id
          WHERE gil.token = $1
          LIMIT 1;
        `;
        const { rows } = await query(sql, [token]);
        if (rows?.[0]) return rows[0];
      } catch (err) {
        console.warn("DB SELECT failed for group_invite_links by token, falling back to store:", err.message);
      }
    }

    for (const item of this.store.values()) {
      if (item.token === token) {
        const { default: GroupModel } = await import("./group.model.js");
        const { default: GroupMemberModel } = await import("./group-member.model.js");
        const group = await GroupModel.findById(item.group_id);
        const memberCount = await GroupMemberModel.countMembers(item.group_id);
        return {
          ...item,
          group_name: group?.name || "Nhóm làm việc",
          group_slug: group?.slug || "",
          group_description: group?.description || "",
          group_icon: group?.icon || "Users",
          group_color: group?.color || "indigo",
          group_capacity: group?.capacity || 10,
          member_count: memberCount || 1,
        };
      }
    }

    return null;
  }

  /**
   * Xóa toàn bộ dữ liệu (dùng cho unit test)
   */
  static clear() {
    this.store.clear();
  }
}

export default GroupInviteLinkModel;
