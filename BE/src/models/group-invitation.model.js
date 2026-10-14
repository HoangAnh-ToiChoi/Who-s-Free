import { randomUUID } from "node:crypto";
import { query, withTransaction } from "../configs/db.config.js";
import AppError from "../utils/AppError.js";

/**
 * GroupInvitationModel - Data Access Layer cho Bảng public.group_invitations
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Thực thi các thao tác đọc/ghi dữ liệu lời mời tham gia nhóm
 *   - Lưu trữ bản băm token (token_hash) thay vì plain text token
 *   - Hỗ trợ in-memory store song song cho test môi trường cô lập
 *   - Hỗ trợ in-memory store song song cho test môi trường cô lập
 */
class GroupInvitationModel {
  static store = new Map();

  /**
   * Tạo bản ghi lời mời mới
   */
  static async create({
    id,
    groupId,
    email,
    role = "member",
    tokenHash,
    invitedBy,
    expiresAt,
  }) {
    const inviteId = id || randomUUID();
    const normalizedEmail = (email || "").trim().toLowerCase();
    const now = new Date();

    const record = {
      id: inviteId,
      group_id: groupId,
      email: normalizedEmail,
      role,
      token_hash: tokenHash,
      invited_by: invitedBy,
      expires_at: expiresAt,
      status: "pending",
      accepted_at: null,
      accepted_by: null,
      revoked_at: null,
      revoked_by: null,
      created_at: now,
      updated_at: now,
    };

    this.store.set(inviteId, { ...record });

    if (process.env.NODE_ENV === "test") {
      return record;
    }

    try {
      const sql = `
            INSERT INTO public.group_invitations (
              id, group_id, email, role, token_hash, invited_by, expires_at, status, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), NOW())
            RETURNING *;
          `;
      const { rows } = await query(sql, [
        inviteId,
        groupId,
        normalizedEmail,
        role,
        tokenHash,
        invitedBy,
        expiresAt,
      ]);
      return rows?.[0] || record;
    } catch (err) {
      console.warn("DB INSERT failed for group_invitations, falling back to memory store:", err.message);
      return record;
    }
  }

  /**
   * Tìm lời mời theo token hash kèm thông tin Nhóm và Người mời
   */
  static async findByTokenHash(tokenHash) {
    if (!tokenHash) return null;

    if (process.env.NODE_ENV !== "test") {
      try {
        const sql = `
              SELECT 
                gi.*,
                g.name as group_name,
                g.slug as group_slug,
                g.description as group_description,
                g.icon as group_icon,
                g.color as group_color,
                g.capacity as group_capacity,
                (SELECT COUNT(*)::int FROM public.group_members WHERE group_id = gi.group_id) as member_count,
                u.full_name as inviter_name,
                u.email as inviter_email
              FROM public.group_invitations gi
              LEFT JOIN public.groups g ON gi.group_id = g.id
              LEFT JOIN public.users u ON gi.invited_by = u.id
              WHERE gi.token_hash = $1
              LIMIT 1;
            `;
        const { rows } = await query(sql, [tokenHash]);
        if (rows?.[0]) return rows[0];
      } catch (err) {
        console.warn("DB SELECT failed for group_invitations by token_hash, falling back to store:", err.message);
      }
    }

    for (const item of this.store.values()) {
      if (item.token_hash === tokenHash) {
        const { default: GroupModel } = await import("./group.model.js");
        const { default: UserModel } = await import("./user.model.js");
        const group = await GroupModel.findById(item.group_id);
        const inviter = await UserModel.findById(item.invited_by);
        return {
          ...item,
          group_name: group?.name || "Nhóm làm việc",
          group_slug: group?.slug || "",
          group_description: group?.description || "",
          group_icon: group?.icon || "Users",
          group_color: group?.color || "indigo",
          group_capacity: group?.capacity || 10,
          inviter_name: inviter?.full_name || inviter?.name || "Quản trị viên",
          inviter_email: inviter?.email || "",
        };
      }
    }
    return null;
  }

  /**
   * Tìm lời mời theo ID
   */
  static async findById(id) {
    if (!id) return null;

    if (process.env.NODE_ENV !== "test") {
      try {
        const { rows } = await query(
          "SELECT * FROM public.group_invitations WHERE id = $1 LIMIT 1;",
          [id]
        );
        if (rows?.[0]) return rows[0];
      } catch (err) {
        console.warn("Database query failed in findById, falling back to store:", err.message);
      }
    }
    return this.store.get(id) || null;
  }

  /**
   * Lấy danh sách các lời mời đang chờ (pending và chưa hết hạn) của một nhóm
   */
  static async findPendingByGroupId(groupId) {
    if (!groupId) return [];

    if (process.env.NODE_ENV === "test") {
      const now = new Date();
      return [...this.store.values()]
        .filter((item) => item.group_id === groupId && item.status === "pending" && new Date(item.expires_at) > now)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    const sql = `
          SELECT 
            gi.*,
            u.full_name as inviter_name,
            u.email as inviter_email
          FROM public.group_invitations gi
          LEFT JOIN public.users u ON gi.invited_by = u.id
          WHERE gi.group_id = $1 AND gi.status = 'pending' AND gi.expires_at > NOW()
          ORDER BY gi.created_at DESC;
        `;
    try {
      const { rows } = await query(sql, [groupId]);
      return rows || [];
    } catch (err) {
      console.warn("Database query failed in findPendingByGroupId, falling back to store:", err.message);
      const now = new Date();
      return [...this.store.values()]
        .filter((item) => item.group_id === groupId && item.status === "pending" && new Date(item.expires_at) > now)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  }

  /**
   * Tìm lời mời active (pending và chưa hết hạn) của một email trong nhóm
   */
  static async findActiveByGroupAndEmail(groupId, email) {
    if (!groupId || !email) return null;
    const normalizedEmail = email.trim().toLowerCase();

    if (process.env.NODE_ENV !== "test") {
      try {
        const sql = `
              SELECT * FROM public.group_invitations
              WHERE group_id = $1 AND email = $2 AND status = 'pending' AND expires_at > NOW()
              ORDER BY created_at DESC
              LIMIT 1;
            `;
        const { rows } = await query(sql, [groupId, normalizedEmail]);
        if (rows?.[0]) return rows[0];
      } catch (err) {
        console.warn("Database query failed in findActiveByGroupAndEmail, falling back to store:", err.message);
      }
    }

    const now = new Date();
    return [...this.store.values()].find((item) =>
      item.group_id === groupId &&
      (item.email || "").toLowerCase() === normalizedEmail &&
      item.status === "pending" &&
      new Date(item.expires_at) > now
    ) || null;
  }

  /** Atomically adds the member and consumes the invitation. */
  static async acceptWithMember({ id, userId, role, groupRole }) {
    const doMemoryAccept = async () => {
      const invitation = await this.findById(id);
      if (!invitation || invitation.status !== "pending" || new Date(invitation.expires_at) <= new Date()) {
        throw AppError.conflict("Lời mời không còn hiệu lực", "INVITATION_NOT_ACTIVE");
      }
      const { default: GroupMemberModel } = await import("./group-member.model.js");
      const member = await GroupMemberModel.addMemberWithCapacityCheck({
        groupId: invitation.group_id,
        userId,
        role,
        groupRole,
      });
      await this.updateStatus(id, {
        status: "accepted",
        acceptedAt: new Date(),
        acceptedBy: userId,
      });
      return member;
    };

    if (process.env.NODE_ENV === "test") {
      return await doMemoryAccept();
    }

    try {
      return await withTransaction(async (client) => {
        const invitationResult = await client.query(
          "SELECT * FROM public.group_invitations WHERE id = $1 FOR UPDATE;",
          [id]
        );
        const invitation = invitationResult.rows?.[0];
        if (!invitation) {
          throw AppError.notFound("Không tìm thấy lời mời", "INVITATION_NOT_FOUND");
        }
        if (invitation.status !== "pending" || new Date(invitation.expires_at) <= new Date()) {
          throw AppError.conflict("Lời mời không còn hiệu lực", "INVITATION_NOT_ACTIVE");
        }

        const groupResult = await client.query(
          "SELECT id, capacity FROM public.groups WHERE id = $1 FOR UPDATE;",
          [invitation.group_id]
        );
        const group = groupResult.rows?.[0];
        if (!group) throw AppError.notFound("Không tìm thấy nhóm", "GROUP_NOT_FOUND");

        const existingResult = await client.query(
          "SELECT id FROM public.group_members WHERE group_id = $1 AND user_id = $2 LIMIT 1;",
          [group.id, userId]
        );
        if (existingResult.rows?.length) {
          throw AppError.conflict("Bạn đã là thành viên của nhóm rồi", "ALREADY_MEMBER");
        }

        const countResult = await client.query(
          "SELECT COUNT(*) AS count FROM public.group_members WHERE group_id = $1;",
          [group.id]
        );
        if (Number.parseInt(countResult.rows?.[0]?.count || "0", 10) >= Number(group.capacity || 10)) {
          throw AppError.badRequest("Nhóm đã đạt số lượng thành viên tối đa", "GROUP_CAPACITY_FULL");
        }

        const memberResult = await client.query(
          `INSERT INTO public.group_members (id, group_id, user_id, role, group_role, joined_at)
           VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *;`,
          [randomUUID(), group.id, userId, role, groupRole]
        );
        await client.query(
          `UPDATE public.group_invitations
           SET status = 'accepted', accepted_at = NOW(), accepted_by = $2, updated_at = NOW()
           WHERE id = $1;`,
          [id, userId]
        );
        return memberResult.rows[0];
      });
    } catch (err) {
      if (err instanceof AppError) throw err;
      console.warn("DB acceptWithMember failed, falling back to store:", err.message);
      return await doMemoryAccept();
    }
  }

  /**
   * Cập nhật trạng thái lời mời
   */
  static async updateStatus(id, { status, acceptedAt, acceptedBy, revokedAt, revokedBy }) {
    if (!id) return null;

    if (process.env.NODE_ENV !== "test") {
      try {
        const sql = `
          UPDATE public.group_invitations
          SET status = COALESCE($2, status),
              accepted_at = COALESCE($3, accepted_at),
              accepted_by = COALESCE($4, accepted_by),
              revoked_at = COALESCE($5, revoked_at),
              revoked_by = COALESCE($6, revoked_by),
              updated_at = NOW()
          WHERE id = $1
          RETURNING *;
        `;
        const { rows } = await query(sql, [
          id,
          status || null,
          acceptedAt || null,
          acceptedBy || null,
          revokedAt || null,
          revokedBy || null,
        ]);
        if (rows?.[0]) return rows[0];
      } catch (err) {
        console.warn("DB updateStatus failed, updating store:", err.message);
      }
    }

    const inMem = this.store.get(id);
    if (inMem) {
      if (status) inMem.status = status;
      if (acceptedAt) inMem.accepted_at = acceptedAt;
      if (acceptedBy) inMem.accepted_by = acceptedBy;
      if (revokedAt) inMem.revoked_at = revokedAt;
      if (revokedBy) inMem.revoked_by = revokedBy;
      inMem.updated_at = new Date();
      this.store.set(id, inMem);
    }

    return inMem || null;
  }

  /**
   * Vô hiệu hóa (revoke) tất cả lời mời pending của một email trong nhóm
   */
  static async revokeActiveByGroupAndEmail(groupId, email, revokedBy, exceptInvitationId = null) {
    if (!groupId || !email) return;
    const normalizedEmail = email.trim().toLowerCase();

    if (process.env.NODE_ENV !== "test") {
      try {
        const sql = `
          UPDATE public.group_invitations
          SET status = 'revoked', revoked_at = NOW(), revoked_by = $3, updated_at = NOW()
          WHERE group_id = $1 AND email = $2 AND status = 'pending'
            AND ($4::uuid IS NULL OR id <> $4);
        `;
        await query(sql, [groupId, normalizedEmail, revokedBy || null, exceptInvitationId]);
      } catch (err) {
        console.warn("DB revokeActiveByGroupAndEmail failed, falling back to memory:", err.message);
      }
    }

    for (const item of this.store.values()) {
      if (
        item.group_id === groupId &&
        (item.email || "").toLowerCase() === normalizedEmail &&
        item.status === "pending" &&
        item.id !== exceptInvitationId
      ) {
        item.status = "revoked";
        item.revoked_at = new Date();
        item.revoked_by = revokedBy;
        item.updated_at = new Date();
      }
    }
  }

  /**
   * Xóa một lời mời (dùng cho rollback khi gửi email thất bại)
   */
  static async delete(id) {
    if (!id) return;
    this.store.delete(id);
    if (process.env.NODE_ENV === "test") return;
    try {
      await query("DELETE FROM public.group_invitations WHERE id = $1;", [id]);
    } catch (err) {
      console.warn("DB delete failed, memory store updated:", err.message);
    }
  }

  /**
   * Xóa toàn bộ dữ liệu (dùng cho test)
   */
  static clear() {
    this.store.clear();
  }
}

export default GroupInvitationModel;
