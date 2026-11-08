export function formatUser(raw) {
  if (!raw) return null;
  const fullName =
    raw.fullName ||
    raw.name ||
    raw.full_name ||
    (raw.email ? raw.email.split("@")[0] : "Thành viên");

  return {
    id: raw.id || `usr-${Date.now()}`,
    name: fullName,
    fullName,
    email: (raw.email || "").toLowerCase(),
    avatarUrl: raw.avatarUrl || raw.avatar_url || "",
    role: raw.role || "Member",
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
  };
}

// Chỉ giữ các trường cần cho first paint; email/role/createdAt chỉ sống trong memory (từ /auth/me).
const STORED_USER_FIELDS = ["id", "name", "fullName", "avatarUrl"];

export function toStoredUser(user) {
  if (!user || typeof user !== "object" || !user.id) return null;
  const stored = {};
  for (const field of STORED_USER_FIELDS) {
    if (user[field] !== undefined) stored[field] = user[field];
  }
  return stored;
}
