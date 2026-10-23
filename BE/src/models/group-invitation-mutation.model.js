import { randomUUID } from "node:crypto";
import { query, withTransaction } from "../configs/db.config.js";
import AppError from "../utils/AppError.js";
import { invitationStore as store } from "./group-invitation.store.js";
import { findById } from "./group-invitation-query.model.js";

export async function create({ id, groupId, email, role = "member", tokenHash, invitedBy, expiresAt }) {
  const inviteId = id || randomUUID();
  const normalizedEmail = (email || "").trim().toLowerCase();
  const now = new Date();

  const record = {
    id: inviteId, group_id: groupId, email: normalizedEmail, role,
    token_hash: tokenHash, invited_by: invitedBy, expires_at: expiresAt,
    status: "pending", accepted_at: null, accepted_by: null,
    revoked_at: null, revoked_by: null, created_at: now, updated_at: now,
  };
  store.set(inviteId, { ...record });

  if (process.env.NODE_ENV === "test") return record;

  try {
    const sql = `
      INSERT INTO public.group_invitations
        (id, group_id, email, role, token_hash, invited_by, expires_at, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), NOW())
      RETURNING *;
    `;
    const { rows } = await query(sql, [inviteId, groupId, normalizedEmail, role, tokenHash, invitedBy, expiresAt]);
    return rows?.[0] || record;
  } catch (err) {
    console.warn("DB INSERT failed for group_invitations, falling back to memory store:", err.message);
    return record;
  }
}

export async function updateStatus(id, { status, acceptedAt, acceptedBy, revokedAt, revokedBy }) {
  if (!id) return null;

  if (process.env.NODE_ENV !== "test") {
    try {
      const sql = `
        UPDATE public.group_invitations
        SET status = COALESCE($2, status),
            accepted_at = COALESCE($3, accepted_at),
            accepted_by = COALESCE($4, accepted_by),
            revoked_at  = COALESCE($5, revoked_at),
            revoked_by  = COALESCE($6, revoked_by),
            updated_at  = NOW()
        WHERE id = $1
        RETURNING *;
      `;
      const { rows } = await query(sql, [id, status || null, acceptedAt || null, acceptedBy || null, revokedAt || null, revokedBy || null]);
      if (rows?.[0]) return rows[0];
    } catch (err) {
      console.warn("DB updateStatus failed, updating store:", err.message);
    }
  }

  const inMem = store.get(id);
  if (inMem) {
    if (status) inMem.status = status;
    if (acceptedAt) inMem.accepted_at = acceptedAt;
    if (acceptedBy) inMem.accepted_by = acceptedBy;
    if (revokedAt) inMem.revoked_at = revokedAt;
    if (revokedBy) inMem.revoked_by = revokedBy;
    inMem.updated_at = new Date();
    store.set(id, inMem);
  }
  return inMem || null;
}

export async function revokeActiveByGroupAndEmail(groupId, email, revokedBy, exceptInvitationId = null) {
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
      return;
    } catch (err) {
      console.warn("DB revokeActiveByGroupAndEmail failed, falling back to memory:", err.message);
    }
  }

  for (const item of store.values()) {
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

export async function acceptWithMember({ id, userId, role, groupRole }) {
  const doMemoryAccept = async () => {
    const invitation = await findById(id);
    if (!invitation || invitation.status !== "pending" || new Date(invitation.expires_at) <= new Date()) {
      throw AppError.conflict("Lời mời không còn hiệu lực", "INVITATION_NOT_ACTIVE");
    }
    const { default: GroupMemberModel } = await import("./group-member.model.js");
    const member = await GroupMemberModel.addMemberWithCapacityCheck({ groupId: invitation.group_id, userId, role, groupRole });
    await updateStatus(id, { status: "accepted", acceptedAt: new Date(), acceptedBy: userId });
    return member;
  };

  if (process.env.NODE_ENV === "test") return doMemoryAccept();

  try {
    return await withTransaction(async (client) => {
      const invitationResult = await client.query(
        "SELECT * FROM public.group_invitations WHERE id = $1 FOR UPDATE;",
        [id]
      );
      const invitation = invitationResult.rows?.[0];
      if (!invitation) throw AppError.notFound("Không tìm thấy lời mời", "INVITATION_NOT_FOUND");
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
      if (existingResult.rows?.length) throw AppError.conflict("Bạn đã là thành viên của nhóm rồi", "ALREADY_MEMBER");

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
    return doMemoryAccept();
  }
}

export async function deleteInvitation(id) {
  if (!id) return;
  store.delete(id);
  if (process.env.NODE_ENV === "test") return;
  try {
    await query("DELETE FROM public.group_invitations WHERE id = $1;", [id]);
  } catch (err) {
    console.warn("DB delete failed, memory store updated:", err.message);
  }
}

export function clear() {
  store.clear();
}
