export function toPublicInviteLink(link, origin = "") {
  if (!link) return null;

  const token = link.token || null;
  const baseUrl = origin ? origin.replace(/\/+$/, "") : "";

  return {
    id: link.id,
    groupId: link.group_id || link.groupId,
    token,
    expiresAt: link.expires_at || link.expiresAt,
    createdAt: link.created_at || link.createdAt || new Date().toISOString(),
    revokedAt: link.revoked_at || link.revokedAt || null,
    inviteUrl: token ? `${baseUrl}/join/${token}` : null,
  };
}

export function toPublicJoinPreview(link) {
  if (!link) return null;

  const now = new Date();
  const expiresAt = link.expires_at || link.expiresAt;
  const isExpired = Boolean(expiresAt && new Date(expiresAt) <= now);
  const isRevoked = Boolean(link.revoked_at || link.revokedAt);
  const capacity = parseInt(link.group_capacity ?? link.capacity ?? 10, 10);
  const memberCount = parseInt(link.member_count ?? link.memberCount ?? 0, 10);
  const isGroupFull = memberCount >= capacity;

  return {
    token: link.token,
    expiresAt,
    isExpired,
    isRevoked,
    isGroupFull,
    group: {
      id: link.group_id || link.groupId,
      name: link.group_name || link.name || "Nhóm làm việc",
      slug: link.group_slug || link.slug || "",
      description: link.group_description || link.description || "",
      icon: link.group_icon || link.icon || "Users",
      color: link.group_color || link.color || "indigo",
      capacity,
      memberCount,
    },
  };
}
