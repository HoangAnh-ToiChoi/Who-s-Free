import { createContext, useState, useEffect, useCallback, useRef } from "react";
import authService, {
  getStoredUser,
  clearStoredAuth,
} from "~/service/authService/authService";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Đọc user ngay ở Frame 0 từ localStorage (Zero-Wait State Transfer)
  const [user, setUser] = useState(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(true);
  const authRevision = useRef(0);

  // Kiểm tra phiên đăng nhập khi khởi động ứng dụng
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const initRevision = authRevision.current;
      try {
        const currentUser = await authService.getMe();
        if (isMounted && initRevision === authRevision.current) {
          // /me trả null khi không có token hoặc token đã hết hạn;
          // không giữ lại user cũ trong localStorage như thể vẫn đăng nhập.
          setUser(currentUser);
        }
      } catch (err) {
        console.warn("Auth initialization notice:", err?.message);
        if (isMounted && initRevision === authRevision.current) {
          // Không mở workspace khi không thể xác minh phiên với backend.
          setUser(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const verifyAuthenticatedUser = useCallback(async () => {
    authRevision.current += 1;
    try {
      const currentUser = await authService.getMe();
      if (!currentUser) {
        setUser(null);
        const error = new Error("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
        error.status = 401;
        throw error;
      }

      setUser(currentUser);
      return currentUser;
    } catch (error) {
      if (error.status === 401) {
        setUser(null);
        throw error;
      }

      // Không coi user từ response login/cache là phiên hợp lệ nếu /me chưa xác minh.
      console.warn("Không thể xác minh phiên đăng nhập qua /me:", error?.message);
      setUser(null);
      throw error;
    }
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const result = await authService.login({ email, password });
    const user = await verifyAuthenticatedUser();
    return { ...result, user };
  }, [verifyAuthenticatedUser]);

  const register = useCallback(async ({ fullName, email, password }) => {
    const result = await authService.register({ fullName, email, password });
    const currentUser = await verifyAuthenticatedUser();
    return { ...result, user: currentUser };
  }, [verifyAuthenticatedUser]);

  const registerWithInvitation = useCallback(async ({ token, fullName, password }) => {
    const result = await authService.registerWithInvitation({ token, fullName, password });
    const currentUser = await verifyAuthenticatedUser();
    return { ...result, user: currentUser };
  }, [verifyAuthenticatedUser]);

  const handleGoogleSession = useCallback(async ({ accessToken }) => {
    await authService.syncGoogleSession({ accessToken });
    return await verifyAuthenticatedUser();
  }, [verifyAuthenticatedUser]);

  const logout = useCallback(async () => {
    authRevision.current += 1;
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

  const fetchMe = useCallback(async () => {
    return await verifyAuthenticatedUser();
  }, [verifyAuthenticatedUser]);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    registerWithInvitation,
    handleGoogleSession,
    fetchMe,
    logout,
    forgotPassword,
    verifyOtp,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
