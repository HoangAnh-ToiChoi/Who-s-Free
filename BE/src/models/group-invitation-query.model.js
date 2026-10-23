import { query } from "../configs/db.config.js";
import { invitationStore as store } from "./group-invitation.store.js";

export async function findById(id) {
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
  return store.get(id) || null;
}

export async function findByTokenHash(tokenHash) {
  if (!tokenHash) return null;

  if (process.env.NODE_ENV !== "test") {
    try {
      const sql = `
        SELECT
          gi.*,
          g.name as group_name, g.slug as group_slug, g.description as group_description,
          g.icon as group_icon, g.color as group_color, g.capacity as group_capacity,
          (SELECT COUNT(*)::int FROM public.group_members WHERE group_id = gi.group_id) as member_count,
          u.full_name as inviter_name, u.email as inviter_email
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

  for (const item of store.values()) {
    if (item.token_hash === tokenHash) {
      const { default: GroupModel } = await import("./group.model.js");
      const { default: UserModel } = await import("./user.model.js");
      const [group, inviter] = await Promise.all([
        GroupModel.findById(item.group_id),
        UserModel.findById(item.invited_by),
      ]);
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

export async function findPendingByGroupId(groupId) {
  if (!groupId) return [];

  if (process.env.NODE_ENV === "test") {
    const now = new Date();
    return [...store.values()]
      .filter((item) => item.group_id === groupId && item.status === "pending" && new Date(item.expires_at) > now)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  const sql = `
    SELECT gi.*, u.full_name as inviter_name, u.email as inviter_email
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
    return [...store.values()]
      .filter((item) => item.group_id === groupId && item.status === "pending" && new Date(item.expires_at) > now)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
}

export async function findActiveByGroupAndEmail(groupId, email) {
  if (!groupId || !email) return null;
  const normalizedEmail = email.trim().toLowerCase();

  if (process.env.NODE_ENV !== "test") {
    try {
      const sql = `
        SELECT * FROM public.group_invitations
        WHERE group_id = $1 AND email = $2 AND status = 'pending' AND expires_at > NOW()
        ORDER BY created_at DESC LIMIT 1;
      `;
      const { rows } = await query(sql, [groupId, normalizedEmail]);
      if (rows?.[0]) return rows[0];
    } catch (err) {
      console.warn("Database query failed in findActiveByGroupAndEmail, falling back to store:", err.message);
    }
  }

  const now = new Date();
  return [...store.values()].find((item) =>
    item.group_id === groupId &&
    (item.email || "").toLowerCase() === normalizedEmail &&
    item.status === "pending" &&
    new Date(item.expires_at) > now
  ) || null;
}
