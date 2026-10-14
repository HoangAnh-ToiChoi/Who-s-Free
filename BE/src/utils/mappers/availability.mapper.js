export function toPublicAvailability(a) {
  if (!a) return null;
  return {
    id: a.id,
    sessionId: a.sessionId,
    memberId: a.memberId,
    memberName: a.memberName || "Thành viên",
    role: a.role || "Thành viên",
    groupRole: a.groupRole || "core",
    avatarUrl: a.avatarUrl || null,
    slots: Array.isArray(a.slots) ? a.slots : [],
    updatedAt: a.updatedAt || new Date().toISOString(),
  };
}
