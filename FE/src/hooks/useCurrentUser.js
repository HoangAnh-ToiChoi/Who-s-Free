import { useState, useEffect } from "react";
import http from "~/utils/http";

const DEFAULT_USER = {
  id: "mem-1",
  name: "Maya Lin",
  email: "maya.lin@university.edu",
  role: "Lead Admin",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
};

/**
 * useCurrentUser - Custom hook quản lý thông tin người dùng hiện tại
 * Đọc trực tiếp từ endpoint /currentUser trong db.json (fallback DEFAULT_USER)
 */
export function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState(DEFAULT_USER);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchUser() {
      try {
        const res = await http.get("/currentUser");
        if (isMounted) {
          const user = Array.isArray(res) ? res[0] : res;
          setCurrentUser(user || DEFAULT_USER);
        }
      } catch (err) {
        console.warn("Using default currentUser:", err?.message);
        if (isMounted) {
          setCurrentUser(DEFAULT_USER);
        }
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
