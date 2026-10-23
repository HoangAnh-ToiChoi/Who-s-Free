export function toPublicUser(rawUser) {
  if (!rawUser) return null;

  const metadata = rawUser.user_metadata || {};
  return {
    id: rawUser.id,
    email: (rawUser.email || "").toLowerCase(),
    fullName:
      rawUser.full_name ||
      metadata.full_name ||
      rawUser.fullName ||
      rawUser.name ||
      (rawUser.email ? rawUser.email.split("@")[0] : "Thành viên"),
    avatarUrl:
      rawUser.avatar_url || metadata.avatar_url || rawUser.avatarUrl || "",
    role: rawUser.role || metadata.role || "member",
    createdAt: rawUser.created_at || rawUser.createdAt || new Date().toISOString(),
  };
}
