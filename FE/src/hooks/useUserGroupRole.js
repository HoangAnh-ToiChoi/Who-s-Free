import { useState, useEffect } from "react";
import { groupService } from "~/service/groupService/groupService";

export function useUserGroupRole(groupId) {
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(groupId));
  const [prevGroupId, setPrevGroupId] = useState(groupId);

  if (prevGroupId !== groupId) {
    setPrevGroupId(groupId);
    if (groupId) {
      setRole(null);
      setIsLoading(true);
    }
  }

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    groupService.getGroupById(groupId)
      .then((g) => { if (!cancelled) { setRole(g?.userRole || null); setIsLoading(false); } })
      .catch(() => { if (!cancelled) { setRole(null); setIsLoading(false); } });
    return () => { cancelled = true; };
  }, [groupId]);

  return { role, isLoading };
}

export default useUserGroupRole;
