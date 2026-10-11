import { useContext } from "react";
import { AuthContext } from "~/contexts/AuthContext";

/**
 * useAuth - Custom hook để truy cập trạng thái xác thực và các thao tác Auth
 * Tuân thủ SRP: Chỉ cung cấp interface gọi auth trong React components
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

export default useAuth;
