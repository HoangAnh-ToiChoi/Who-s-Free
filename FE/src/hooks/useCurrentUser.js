import { useAuth } from "~/hooks/useAuth";

/**
 * useCurrentUser - Custom hook quản lý thông tin người dùng hiện tại
 * Đồng bộ trực tiếp với AuthContext (useAuth)
 */
export function useCurrentUser() {
  const { user, isLoading } = useAuth();

  return {
    currentUser: user || null,
    isLoading,
  };
}

export default useCurrentUser;
