import { query } from "../configs/db.config.js";
import { invitationStore as store } from "./group-invitation.store.js";

// NODE_ENV=test dùng store trong bộ nhớ làm test double; môi trường thật chỉ đọc/ghi DB.
const isTest = () => process.env.NODE_ENV === "test";

export const INVITATION_COLUMNS = `id, group_id, email, role, token_hash, invited_by, expires_at, status,
  accepted_at, accepted_by, revoked_at, revoked_by, created_at, updated_at`;

const GI_COLUMNS = INVITATION_COLUMNS.split(",").map((c) => `gi.${c.trim()}`).join(", ");

const isActivePending = (item, now = new Date()) =>
  item.status === "pending" && new Date(item.expires_at) > now;

export async function findById(id) {
  if (!id) return null;
  if (isTest()) return store.get(id) || null;

  const { rows } = await query(
    `SELECT ${INVITATION_COLUMNS} FROM public.group_invitations WHERE id = $1 LIMIT 1;`,
    [id]
  );
  return rows[0] || null;
}

async function findByTokenHashInStore(tokenHash) {
  const item = [...store.values()].find((i) => i.token_hash === tokenHash);
  if (!item) return null;

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

export async function findByTokenHash(tokenHash) {
  if (!tokenHash) return null;
  if (isTest()) return findByTokenHashInStore(tokenHash);

  const { rows } = await query(
    `SELECT ${GI_COLUMNS},
            g.name AS group_name, g.slug AS group_slug, g.description AS group_description,
            g.icon AS group_icon, g.color AS group_color, g.capacity AS group_capacity,
            (SELECT COUNT(*)::int FROM public.group_members WHERE group_id = gi.group_id) AS member_count,
            u.full_name AS inviter_name, u.email AS inviter_email
       FROM public.group_invitations gi
       LEFT JOIN public.groups g ON gi.group_id = g.id
       LEFT JOIN public.users u ON gi.invited_by = u.id
      WHERE gi.token_hash = $1
      LIMIT 1;`,
    [tokenHash]
  );
  return rows[0] || null;
}

export async function findPendingByGroupId(groupId) {
  if (!groupId) return [];
  if (isTest()) {
    return [...store.values()]
      .filter((item) => item.group_id === groupId && isActivePending(item))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  const { rows } = await query(
    `SELECT ${GI_COLUMNS}, u.full_name AS inviter_name, u.email AS inviter_email
       FROM public.group_invitations gi
       LEFT JOIN public.users u ON gi.invited_by = u.id
      WHERE gi.group_id = $1 AND gi.status = 'pending' AND gi.expires_at > NOW()
      ORDER BY gi.created_at DESC;`,
    [groupId]
  );
  return rows;
}

export async function findActiveByGroupAndEmail(groupId, email) {
  if (!groupId || !email) return null;
  const normalizedEmail = email.trim().toLowerCase();

  if (isTest()) {
    return [...store.values()].find((item) =>
      item.group_id === groupId &&
      (item.email || "").toLowerCase() === normalizedEmail &&
      isActivePending(item)
    ) || null;
  }

  const { rows } = await query(
    `SELECT ${INVITATION_COLUMNS} FROM public.group_invitations
      WHERE group_id = $1 AND email = $2 AND status = 'pending' AND expires_at > NOW()
      ORDER BY created_at DESC LIMIT 1;`,
    [groupId, normalizedEmail]
  );
  return rows[0] || null;
}
