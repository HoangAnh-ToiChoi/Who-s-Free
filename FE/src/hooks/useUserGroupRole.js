import { useState, useEffect } from "react";
import { groupService } from "~/service/groupService/groupService";

export function useUserGroupRole(groupId) {
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(groupId));
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [prevGroupId, setPrevGroupId] = useState(groupId);

  if (prevGroupId !== groupId) {
    setPrevGroupId(groupId);
    if (groupId) {
      setRole(null);
      setError(false);
      setIsLoading(true);
    }
  }

  /** Thử tải lại sau khi lỗi (vd: mất mạng). */
  const reload = () => {
    setError(false);
    setIsLoading(true);
    setAttempt((n) => n + 1);
  };

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    groupService.getGroupById(groupId)
      .then((g) => { if (!cancelled) { setRole(g?.userRole || null); setError(false); setIsLoading(false); } })
      .catch(() => { if (!cancelled) { setRole(null); setError(true); setIsLoading(false); } });
    return () => { cancelled = true; };
  }, [groupId, attempt]);

  return { role, isLoading, error, reload };
}

export default useUserGroupRole;
