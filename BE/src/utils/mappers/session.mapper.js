export function toPublicSession(s) {
  if (!s) return null;
  return {
    id: s.id,
    slug: s.slug || s.id,
    groupId: s.group_id || s.groupId,
    groupSlug: s.group_slug || s.groupSlug || "",
    refCode: s.ref_code || s.refCode || "Ref #0000",
    title: s.title,
    description: s.description || "",
    tag: s.tag || "CÔNG VIỆC & HỌC TẬP",
    tagColor: s.tag_color || s.tagColor || "primary",
    dateRange: s.date_range || s.dateRange || "",
    scheduledTime: s.scheduled_time || s.scheduledTime || "Flexible Window",
    location: s.location || "Quán Cafe / Trực tuyến",
    totalMembers: parseInt(s.total_members ?? s.totalMembers ?? 3, 10),
    respondedCount: parseInt(s.responded_count ?? s.respondedCount ?? 0, 10),
    quorumPercent: parseInt(s.quorum_percent ?? s.quorumPercent ?? 0, 10),
    highestOverlapText: s.highest_overlap_text || s.highestOverlapText || "",
    sparkline: s.sparkline || [20, 20, 20, 20, 20],
    status: s.status || "active_poll",
    createdAt: s.created_at || s.createdAt || new Date().toISOString(),
    updatedAt: s.updated_at || s.updatedAt || new Date().toISOString(),
  };
}
