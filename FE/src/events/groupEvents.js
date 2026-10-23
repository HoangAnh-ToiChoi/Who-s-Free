export const GROUP_MEMBERS_CHANGED_EVENT = "whosfree:group-members-changed";

export function notifyGroupMembersChanged(groupId) {
  if (typeof window === "undefined" || !groupId) return;
  window.dispatchEvent(
    new CustomEvent(GROUP_MEMBERS_CHANGED_EVENT, { detail: { groupId } })
  );
}
