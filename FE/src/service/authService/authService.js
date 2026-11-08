/**
 * AuthService - Tầng giao tiếp dữ liệu xác thực (Auth Service Layer)
 * 
 * Tuân thủ Single Responsibility Principle (SRP) & AUTH_REFACTOR_PLAN:
 * - Chỉ chịu trách nhiệm kết nối API xác thực với Backend (/api/auth/*)
 * - Quản lý Access Token trong Memory qua tokenManager (Zero-XSS)
 * - Session Profile cục bộ (rút gọn) nằm ở authStorage.js; quên mật khẩu ở passwordResetService.js
 * - Refresh Token được lưu trữ và bảo vệ hoàn toàn qua HttpOnly Cookie phía BE.
 */

import tokenManager from "~/utils/tokenManager";
import { requestTokenRefresh } from "~/utils/backendApi";
import { formatUser } from "~/utils/authUser";
import { normalizeEmail, sendAuthRequest } from "./authRequest";
import { getStoredUser, setStoredUser, clearStoredUserData } from "./authStorage";
import { createPasswordResetOtp, verifyOtp, resetPassword } from "./passwordResetService";

export { getStoredUser, setStoredUser };

let inFlightGetMe = null;
let authStateVersion = 0;

export function clearStoredAuth() {
  authStateVersion += 1;
  inFlightGetMe = null;
  tokenManager.clearAccessToken();
  clearStoredUserData();
}

function startSession(res, userData) {
  const accessToken = res?.accessToken;
  if (accessToken) tokenManager.setAccessToken(accessToken);

  const user = formatUser(userData);
  setStoredUser(user);
  return { user, accessToken };
}

function postWithCookie(endpoint, body) {
  return sendAuthRequest(endpoint, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(body),
  });
}

/**
 * Đăng ký tài khoản người dùng mới
 * @param {{ fullName: string, email: string, password: string }} payload
 */
export async function register({ fullName, email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const res = await postWithCookie("/auth/register", {
    fullName: fullName.trim(),
    email: normalizedEmail,
    password,
  });
  return startSession(res, res?.user || res || { fullName, email: normalizedEmail });
}

/**
 * Tạo tài khoản cho email được mời (xác nhận bằng token lời mời) rồi đăng nhập luôn
 * @param {{ token: string, fullName: string, password: string }} payload
 */
export async function registerWithInvitation({ token, fullName, password }) {
  const res = await postWithCookie(`/invitations/${encodeURIComponent(token)}/register`, {
    fullName: fullName.trim(),
    password,
  });
  return startSession(res, res?.user || res);
}

/**
 * Đăng nhập người dùng bằng email và mật khẩu
 * @param {{ email: string, password: string }} payload
 */
export async function login({ email, password }) {
  const res = await postWithCookie("/auth/login", { email: normalizeEmail(email), password });
  return startSession(res, res?.user);
}

/**
 * Đồng bộ phiên đăng nhập Google từ OAuth Hash Fragment
 * (Không gửi refreshToken từ FE lên BE theo AUTH_REFACTOR_PLAN §82)
 * @param {{ accessToken: string }} payload
 */
export async function syncGoogleSession({ accessToken }) {
  const res = await postWithCookie("/auth/google/session", { accessToken });
  return startSession(res, res?.user);
}

/**
 * Làm mới Access Token từ Refresh Cookie (Dùng khi F5 reload trang)
 */
export async function refreshSession() {
  try {
    const accessToken = await requestTokenRefresh();
    return { user: null, accessToken };
  } catch (err) {
    tokenManager.clearAccessToken();
    throw err;
  }
}

/**
 * Đăng xuất tài khoản
 */
export async function logout() {
  try {
    await sendAuthRequest("/auth/logout", {
      method: "POST",
      credentials: "include",
    }).catch(() => null);
  } finally {
    clearStoredAuth();
  }
}

/**
 * Lấy thông tin user hiện tại từ token xác thực
 * - Nếu memory chưa có token (sau reload F5), tự động gọi refreshSession trước để lấy Access Token
 * - Gửi Authorization: Bearer <accessToken> tới /api/auth/me
 * - Tự động chặn request trùng lặp (Single-Flight Promise Deduplication)
 */
export async function getMe() {
  if (inFlightGetMe) {
    return inFlightGetMe;
  }

  const requestAuthVersion = authStateVersion;
  const request = (async () => {
    try {
      // Nếu memory chưa có token (ví dụ vừa tải lại trang F5), thử phục hồi bằng refresh cookie
      if (!tokenManager.hasAccessToken()) {
        try {
          await refreshSession();
        } catch {
          // Không có refresh cookie hợp lệ -> phiên đã hết hạn
          clearStoredAuth();
          return null;
        }
      }

      const res = await sendAuthRequest("/auth/me", { method: "GET" });

      const userData = res?.user || res;
      if (userData) {
        const user = formatUser(userData);
        setStoredUser(user);
        return user;
      }

      clearStoredAuth();
      return null;
    } catch (err) {
      // Token hết hạn/không hợp lệ: xóa toàn bộ auth state.
      if (err.status === 401) {
        if (requestAuthVersion === authStateVersion) {
          clearStoredAuth();
        }
        return null;
      }

      throw err;
    } finally {
      if (inFlightGetMe === request) {
        inFlightGetMe = null;
      }
    }
  })();

  inFlightGetMe = request;
  return request;
}

export const authService = {
  register,
  registerWithInvitation,
  login,
  syncGoogleSession,
  refreshSession,
  logout,
  getMe,
  createPasswordResetOtp,
  verifyOtp,
  resetPassword,
  getStoredUser,
  setStoredUser,
  clearStoredAuth,
};

export default authService;
