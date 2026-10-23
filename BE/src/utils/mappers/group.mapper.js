export function toPublicGroup(group) {
  if (!group) return null;

  let memberPreviews = group.member_previews || group.memberPreviews || [];
  if (typeof memberPreviews === "string") {
    try { memberPreviews = JSON.parse(memberPreviews); } catch { memberPreviews = []; }
  }
  if (!Array.isArray(memberPreviews)) memberPreviews = [];

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
    medianResponseHours: group.median_response_hours != null ? parseFloat(group.median_response_hours) : null,
    createdAt: group.created_at || group.createdAt || new Date().toISOString(),
    updatedAt: group.updated_at || group.updatedAt || new Date().toISOString(),
  };
}
