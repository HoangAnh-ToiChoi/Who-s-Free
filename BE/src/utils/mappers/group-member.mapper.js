export function toPublicMember(member) {
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
