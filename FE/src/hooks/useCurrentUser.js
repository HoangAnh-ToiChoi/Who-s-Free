import { useState, useEffect } from "react";
import http from "~/utils/http";

/**
 * useCurrentUser - Custom hook quản lý thông tin người dùng hiện tại
 * Đọc trực tiếp từ endpoint /currentUser trong db.json
 */
export function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchUser() {
      try {
        const res = await http.get("/currentUser");
        if (isMounted) {
          const user = Array.isArray(res) ? res[0] : res;
          setCurrentUser(user || null);
        }
      } catch (err) {
        console.warn("Failed to fetch currentUser:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchUser();
    return () => {
      isMounted = false;
    };
  }, []);

  return { currentUser, isLoading };
}

export default useCurrentUser;
