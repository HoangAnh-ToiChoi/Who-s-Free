import { useEffect } from "react";
import { GROUP_MEMBERS_CHANGED_EVENT } from "~/events/groupEvents";

/** Thành viên được nâng quyền / bị xóa ở tab Thành viên → làm mới số thành viên trên header và tab. */
export function useGroupMembersSync(groupId, onChange) {
  useEffect(() => {
    if (!groupId) return undefined;
    const handle = (event) => {
      if (event.detail?.groupId === groupId) onChange();
    };
    window.addEventListener(GROUP_MEMBERS_CHANGED_EVENT, handle);
    return () => window.removeEventListener(GROUP_MEMBERS_CHANGED_EVENT, handle);
  }, [groupId, onChange]);
}
