export function toPublicInvitation(inv) {
  if (!inv) return null;

  return {
    id: inv.id,
    groupId: inv.group_id || inv.groupId,
    email: (inv.email || "").toLowerCase(),
    role: inv.role || "member",
    status: inv.status || "pending",
    expiresAt: inv.expires_at || inv.expiresAt,
    createdAt: inv.created_at || inv.createdAt || new Date().toISOString(),
    acceptedAt: inv.accepted_at || inv.acceptedAt || null,
    revokedAt: inv.revoked_at || inv.revokedAt || null,
    invitedBy: inv.invited_by || inv.invitedBy || null,
    inviter: {
      id: inv.inviter_id || inv.invited_by || inv.invitedBy || null,
      name: inv.inviter_name || inv.inviterName || "Quản trị viên",
      email: inv.inviter_email || inv.inviterEmail || "",
    },
    group: inv.group_name || inv.groupName ? {
      id: inv.group_id || inv.groupId,
      name: inv.group_name || inv.groupName,
      slug: inv.group_slug || inv.groupSlug || "",
      icon: inv.group_icon || inv.groupIcon || "Users",
      color: inv.group_color || inv.groupColor || "indigo",
      capacity: parseInt(inv.group_capacity || inv.groupCapacity || 10, 10),
    } : undefined,
  };
}
