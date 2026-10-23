// BE/src/utils/mappers/session.mapper.js
import { toDateString } from "../date.js";

export function toPublicSession(s) {
  if (!s) return null;
  const totalMembers = parseInt(s.total_members ?? s.totalMembers ?? 0, 10);
  const respondedCount = parseInt(s.responded_count ?? s.respondedCount ?? 0, 10);
  const quorumPercent = totalMembers > 0 ? Math.round((respondedCount / totalMembers) * 100) : 0;

  return {
    id: s.id,
    slug: s.slug || s.id,
    groupId: s.group_id || s.groupId,
    refCode: s.ref_code || s.refCode || "Ref #0000",
    title: s.title,
    description: s.description || "",
    tag: s.tag || "CÔNG VIỆC & HỌC TẬP",
    tagColor: s.tag_color || s.tagColor || "primary",
    dateRange: s.date_range || s.dateRange || "",
    scheduledTime: s.scheduled_time || s.scheduledTime || "Flexible Window",
    location: s.location || "Quán Cafe / Trực tuyến",
    totalMembers,
    respondedCount,
    quorumPercent,
    status: s.status || "active_poll",
    finalized: s.status === "finalized" && s.finalized_date
      ? {
          date: toDateString(s.finalized_date),
          startMinutes: s.finalized_start_minutes,
          endMinutes: s.finalized_end_minutes,
          finalizedAt: s.finalized_at,
          note: s.export_note || "",
        }
      : null,
    createdAt: s.created_at || s.createdAt || new Date().toISOString(),
    updatedAt: s.updated_at || s.updatedAt || new Date().toISOString(),
  };
}
