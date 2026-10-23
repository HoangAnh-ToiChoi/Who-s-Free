/**
 * AuthService - Tầng giao tiếp dữ liệu xác thực (Auth Service Layer)
 * 
 * Tuân thủ Single Responsibility Principle (SRP) & AUTH_REFACTOR_PLAN:
 * - Chỉ chịu trách nhiệm kết nối API xác thực với Backend (/api/auth/*)
 * - Quản lý Access Token trong Memory qua tokenManager (Zero-XSS)
 * - Quản lý Session Profile cục bộ (localStorage currentUser phục vụ Frame 0)
 * - Refresh Token được lưu trữ và bảo vệ hoàn toàn qua HttpOnly Cookie phía BE.
 */

import tokenManager from "~/utils/tokenManager";
import { backendRequest, requestTokenRefresh } from "~/utils/backendApi";
import { clearAllAvailabilityCache } from "~/utils/availabilityCache";

const STORAGE_KEYS = {
  CURRENT_USER: "currentUser",
};

let inFlightGetMe = null;
let authStateVersion = 0;

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function formatUser(raw) {
  if (!raw) return null;
  const fullName =
    raw.fullName ||
    raw.name ||
    raw.full_name ||
    (raw.email ? raw.email.split("@")[0] : "Thành viên");

  return {
    id: raw.id || `usr-${Date.now()}`,
    name: fullName,
    fullName,
    email: (raw.email || "").toLowerCase(),
    avatarUrl: raw.avatarUrl || raw.avatar_url || "",
    role: raw.role || "Member",
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
  };
}

// ─── Local Storage Session Profile Helpers (Zero-Wait State Transfer) ────────

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  } catch (err) {
    console.warn("Could not save user to localStorage:", err);
  }
}

export function clearStoredAuth() {
  authStateVersion += 1;
  inFlightGetMe = null;
  tokenManager.clearAccessToken();
  // Dọn sạch user cache và bất kỳ token cũ nào còn sót lại
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("whosfree_auth_users");
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  clearAllAvailabilityCache();
}

// ─── API Client Wrapper ───────────────────────────────────────────────────────

async function sendAuthRequest(endpoint, options = {}) {
  return backendRequest(endpoint, {
    ...options,
    credentials: options.credentials || "omit",
  });
}

// ─── Authentication Operations ────────────────────────────────────────────────

/**
 * Đăng ký tài khoản người dùng mới
 * @param {{ fullName: string, email: string, password: string }} payload
 */
export async function register({ fullName, email, password }) {
  const normalizedEmail = normalizeEmail(email);

  const res = await sendAuthRequest("/auth/register", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password,
    }),
  });

  const accessToken = res?.accessToken;
  if (accessToken) {
    tokenManager.setAccessToken(accessToken);
  }

  const userData = res?.user || res || { fullName, email: normalizedEmail };
  const user = formatUser(userData);

  setStoredUser(user);
  return { user, accessToken };
}

/**
 * Tạo tài khoản cho email được mời (xác nhận bằng token lời mời) rồi đăng nhập luôn
 * @param {{ token: string, fullName: string, password: string }} payload
 */
export async function registerWithInvitation({ token, fullName, password }) {
  const res = await sendAuthRequest(`/invitations/${encodeURIComponent(token)}/register`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({ fullName: fullName.trim(), password }),
  });

  const accessToken = res?.accessToken;
  if (accessToken) tokenManager.setAccessToken(accessToken);

  const user = formatUser(res?.user || res);
  setStoredUser(user);
  return { user, accessToken };
}

/**
 * Đăng nhập người dùng bằng email và mật khẩu
 * @param {{ email: string, password: string }} payload
 */
export async function login({ email, password }) {
  const normalizedEmail = normalizeEmail(email);

  const res = await sendAuthRequest("/auth/login", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({ email: normalizedEmail, password }),
  });

  const accessToken = res?.accessToken;
  if (accessToken) {
    tokenManager.setAccessToken(accessToken);
  }

  const user = formatUser(res?.user);
  setStoredUser(user);

  return { user, accessToken };
}

/**
 * Đồng bộ phiên đăng nhập Google từ OAuth Hash Fragment
 * (Không gửi refreshToken từ FE lên BE theo AUTH_REFACTOR_PLAN §82)
 * @param {{ accessToken: string }} payload
 */
export async function syncGoogleSession({ accessToken }) {
  try {
    const res = await sendAuthRequest("/auth/google/session", {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ accessToken }),
    });

    const newAccessToken = res?.accessToken;
    if (newAccessToken) {
      tokenManager.setAccessToken(newAccessToken);
    }

    const user = formatUser(res?.user);
    setStoredUser(user);

    return { user, accessToken: newAccessToken };
  } catch (err) {
    console.error("Lỗi đồng bộ session Google:", err);
    throw err;
  }
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

/**
 * Tạo và gửi mã OTP 6 số để khôi phục mật khẩu
 * @param {string} email
 */
export async function createPasswordResetOtp(email) {
  const normalizedEmail = normalizeEmail(email);
  const res = await sendAuthRequest("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email: normalizedEmail }),
  });

  return res?.otp || null;
}

/**
 * Xác thực mã OTP 6 số
 * @param {{ email: string, otp: string }} payload
 */
export async function verifyOtp({ email, otp }) {
  const normalizedEmail = normalizeEmail(email);
  const res = await sendAuthRequest("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email: normalizedEmail, otp: String(otp).trim() }),
  });

  return res?.resetToken;
}

/**
 * Đặt lại mật khẩu mới
 * @param {{ email: string, resetToken: string, password: string, confirmPassword: string }} payload
 */
export async function resetPassword({ email, resetToken, password, confirmPassword }) {
  const normalizedEmail = normalizeEmail(email);
  const res = await sendAuthRequest("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({
      email: normalizedEmail,
      resetToken,
      password,
      confirmPassword,
    }),
  });

  return res?.message || "SUCCESS";
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
