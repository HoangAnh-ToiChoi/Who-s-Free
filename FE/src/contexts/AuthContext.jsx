import { createContext, useState, useEffect, useCallback } from "react";
import authService, {
  getStoredUser,
  setStoredUser,
  clearStoredAuth,
} from "~/service/authService/authService";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Đọc user ngay ở Frame 0 từ localStorage (Zero-Wait State Transfer)
  const [user, setUser] = useState(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(true);

  // Kiểm tra phiên đăng nhập khi khởi động ứng dụng
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const currentUser = await authService.getMe();
        if (isMounted && currentUser) {
          setUser(currentUser);
        }
      } catch (err) {
        console.warn("Auth initialization notice:", err?.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const result = await authService.login({ email, password });
    setUser(result.user);
    return result;
  }, []);

  const register = useCallback(async ({ fullName, email, password }) => {
    const newUser = await authService.register({ fullName, email, password });
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      clearStoredAuth();
      setUser(null);
    }
  }, []);

  const forgotPassword = useCallback(async (email) => {
    return await authService.createPasswordResetOtp(email);
  }, []);

  const verifyOtp = useCallback(async (email, otp) => {
    return await authService.verifyOtp({ email, otp });
  }, []);

  const resetPassword = useCallback(async (payload) => {
    return await authService.resetPassword(payload);
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    forgotPassword,
    verifyOtp,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
