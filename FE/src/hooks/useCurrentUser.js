import { useAuth } from "~/hooks/useAuth";

const DEFAULT_USER = {
  id: "mem-1",
  name: "Maya Lin",
  email: "maya.lin@university.edu",
  role: "Lead Admin",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
};

/**
 * useCurrentUser - Custom hook quản lý thông tin người dùng hiện tại
 * Đồng bộ trực tiếp với AuthContext (useAuth)
 */
export function useCurrentUser() {
  const { user, isLoading } = useAuth();

  return {
    currentUser: user || DEFAULT_USER,
    isLoading,
  };
}

export default useCurrentUser;
