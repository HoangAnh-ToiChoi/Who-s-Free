// BE/src/utils/permissions.js

/** Thành viên có quyền quản trị nhóm (owner hoặc lead). */
export function isLeadOrOwner(member) {
  return member?.role === "owner" || member?.role === "lead";
}
