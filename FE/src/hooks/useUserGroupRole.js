import { useState, useEffect } from "react";
import { groupService } from "~/service/groupService/groupService";

export function useUserGroupRole(groupId) {
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setRole(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    groupService.getGroupById(groupId)
      .then((g) => setRole(g?.userRole || null))
      .catch(() => setRole(null))
      .finally(() => setIsLoading(false));
  }, [groupId]);

  return { role, isLoading };
}

export default useUserGroupRole;
