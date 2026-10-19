// BE/src/utils/mappers/availability.mapper.js

export function toPublicSlot(row) {
  if (!row) return null;
  const dateStr = row.date_str instanceof Date
    ? row.date_str.toISOString().slice(0, 10)
    : String(row.date_str ?? "");
  return {
    id: row.id,
    dayIndex: row.day_index,
    dateStr,
    startMinutes: row.start_minutes,
    endMinutes: row.end_minutes,
    label: row.label || "Available",
    note: row.note || "",
  };
}

export function toPublicUserAvailability({ sessionId, userId, slots }) {
  return {
    sessionId,
    userId,
    slots: (slots || []).map(toPublicSlot),
  };
}

export function toPublicMemberAvailability({ userId, memberName, role, groupRole, avatarUrl, slots }) {
  return {
    memberId: userId,
    memberName: memberName || "Thành viên",
    role: role || "member",
    groupRole: groupRole || "core",
    avatarUrl: avatarUrl || null,
    slots: (slots || []).map(toPublicSlot),
  };
}

// Kept for backward compatibility with any existing imports
export function toPublicAvailability(a) {
  if (!a) return null;
  return {
    id: a.id,
    sessionId: a.session_id || a.sessionId,
    userId: a.user_id || a.userId,
    slots: Array.isArray(a.slots) ? a.slots : [],
    updatedAt: a.updated_at || a.updatedAt || new Date().toISOString(),
  };
}
