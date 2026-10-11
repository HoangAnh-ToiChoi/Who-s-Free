/**
 * AuthService - Tầng giao tiếp dữ liệu xác thực (Auth Service Layer)
 * 
 * Tuân thủ Single Responsibility Principle (SRP):
 * - Chỉ chịu trách nhiệm kết nối API xác thực với Backend (/api/auth/*)
 * - Quản lý lưu trữ Token và Session cục bộ (localStorage)
 * - Cung cấp cơ chế Offline Fallback an toàn giúp trải nghiệm và kiểm thử UI không bị gián đoạn.
 */

const STORAGE_KEYS = {
  ACCESS_TOKEN: "accessToken",
  REFRESH_TOKEN: "refreshToken",
  CURRENT_USER: "currentUser",
  MOCK_USERS: "whosfree_auth_users",
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

// ─── Local Storage Token & Session Helpers ────────────────────────────────────

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

export function getStoredTokens() {
  return {
    accessToken: localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || null,
    refreshToken: localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || null,
  };
}

export function setStoredTokens({ accessToken, refreshToken }) {
  authStateVersion += 1;
  inFlightGetMe = null;
  if (accessToken) {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  }
  if (refreshToken) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }
}

export function clearStoredAuth() {
  authStateVersion += 1;
  inFlightGetMe = null;
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
}

// ─── Local Mock Fallback Helpers (Dành cho kiểm thử khi BE chưa bật) ─────────

function getMockUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MOCK_USERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMockUser(user) {
  const users = getMockUsers();
  const filtered = users.filter((u) => u.email !== user.email);
  filtered.push(user);
  localStorage.setItem(STORAGE_KEYS.MOCK_USERS, JSON.stringify(filtered));
}

// ─── API Client Wrapper ───────────────────────────────────────────────────────

async function sendAuthRequest(endpoint, options = {}) {
  const { accessToken } = getStoredTokens();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: "include", // Mang cookie httpOnly qua lại
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage =
      data?.message || data?.error || `Request failed with status ${response.status}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.response = data;
    throw error;
  }

  return data;
}

// ─── Authentication Operations ────────────────────────────────────────────────

/**
 * Đăng ký tài khoản người dùng mới
 * @param {{ fullName: string, email: string, password: string }} payload
 */
export async function register({ fullName, email, password }) {
  const normalizedEmail = normalizeEmail(email);

  try {
    // 1. Gửi request đến Backend API
    const res = await sendAuthRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: fullName.trim(),
        email: normalizedEmail,
        password,
      }),
    });

    const userData = res.data?.user || res.data || { fullName, email: normalizedEmail };
    const user = formatUser(userData);
    const accessToken = res.data?.accessToken;
    const refreshToken = res.data?.refreshToken;

    if (accessToken) {
      setStoredTokens({ accessToken, refreshToken });
    }
    setStoredUser(user);
    saveMockUser({ ...user, password });

    return { user, accessToken };
  } catch (err) {
    if (err.status && err.status < 500) {
      throw err;
    }

    console.warn("Backend offline, sử dụng offline auth fallback:", err.message);
    const existing = getMockUsers().find((u) => u.email === normalizedEmail);
    if (existing) {
      throw new Error("EMAIL_ALREADY_REGISTERED");
    }

    const fallbackUser = formatUser({ fullName, email: normalizedEmail });
    setStoredUser(fallbackUser);
    saveMockUser({ ...fallbackUser, password });
    return { user: fallbackUser, accessToken: null };
  }
}

/**
 * Đăng nhập người dùng bằng email và mật khẩu
 * @param {{ email: string, password: string }} payload
 */
export async function login({ email, password }) {
  const normalizedEmail = normalizeEmail(email);

  try {
    const res = await sendAuthRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: normalizedEmail, password }),
    });

    const user = formatUser(res.data?.user);
    const accessToken = res.data?.accessToken;
    const refreshToken = res.data?.refreshToken;

    setStoredTokens({ accessToken, refreshToken });
    setStoredUser(user);

    return { user, accessToken };
  } catch (err) {
    if (err.status && err.status < 500) {
      throw err;
    }

    console.warn("Backend offline, kiểm tra dữ liệu local:", err.message);
    const mockUser = getMockUsers().find(
      (u) => u.email === normalizedEmail && u.password === password
    );

    if (mockUser || (normalizedEmail === "demo@whosfree.com" && password.length >= 8)) {
      const user = formatUser(mockUser || { email: normalizedEmail, fullName: "Demo User" });
      const demoToken = `mock-token-${Date.now()}`;
      setStoredTokens({ accessToken: demoToken });
      setStoredUser(user);
      return { user, accessToken: demoToken };
    }

    throw new Error("INVALID_CREDENTIALS");
  }
}

/**
 * Đồng bộ phiên đăng nhập Google từ OAuth Hash Fragment
 * @param {{ accessToken: string, refreshToken?: string }} payload
 */
export async function syncGoogleSession({ accessToken, refreshToken }) {
  try {
    const res = await sendAuthRequest("/api/auth/google/session", {
      method: "POST",
      body: JSON.stringify({ accessToken, refreshToken }),
    });

    const user = formatUser(res.data?.user);
    const systemToken = res.data?.accessToken || accessToken;
    const systemRefreshToken = res.data?.refreshToken || refreshToken;

    setStoredTokens({ accessToken: systemToken, refreshToken: systemRefreshToken });
    setStoredUser(user);

    return { user, accessToken: systemToken };
  } catch (err) {
    console.error("Lỗi đồng bộ session Google:", err);
    throw err;
  }
}

/**
 * Đăng xuất tài khoản
 */
export async function logout() {
  try {
    await sendAuthRequest("/api/auth/logout", {
      method: "POST",
    }).catch(() => null);
  } finally {
    clearStoredAuth();
  }
}

/**
 * Lấy thông tin user hiện tại từ token xác thực (Chuẩn Threads / Meta)
 * - Luôn xác thực lại token hiện có với backend, không dùng user cache thay cho /me
 * - Tự động chặn request trùng lặp (Single-Flight Promise Deduplication)
 */
export async function getMe() {
  // Luôn hỏi backend, kể cả khi localStorage không có token: session có thể
  // còn trong HttpOnly cookie và backend sẽ tự trả 401 nếu không có phiên.
  if (inFlightGetMe) {
    return inFlightGetMe;
  }

  const requestAuthVersion = authStateVersion;
  const request = (async () => {
    try {
      const res = await sendAuthRequest("/api/auth/me", {
        method: "GET",
      });

      const userData = res.data?.user || res.data;
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
        // Bỏ qua 401 từ request cũ nếu user vừa đăng nhập trong lúc request bay.
        if (requestAuthVersion === authStateVersion) {
          clearStoredAuth();
        }
        return null;
      }

      // Lỗi mạng/server không đồng nghĩa token hợp lệ; để AuthContext quyết định
      // giữ user cache để giao diện không bị logout giả khi backend tạm gián đoạn.
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
  const res = await sendAuthRequest("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email: normalizedEmail }),
  });

  return res.data?.otp || null;
}

/**
 * Xác thực mã OTP 6 số
 * @param {{ email: string, otp: string }} payload
 */
export async function verifyOtp({ email, otp }) {
  const normalizedEmail = normalizeEmail(email);
  const res = await sendAuthRequest("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email: normalizedEmail, otp: String(otp).trim() }),
  });

  return res.data?.resetToken;
}

/**
 * Đặt lại mật khẩu mới
 * @param {{ email: string, resetToken: string, password: string, confirmPassword: string }} payload
 */
export async function resetPassword({ email, resetToken, password, confirmPassword }) {
  const normalizedEmail = normalizeEmail(email);
  const res = await sendAuthRequest("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({
      email: normalizedEmail,
      resetToken,
      password,
      confirmPassword,
    }),
  });

  return res.message || "SUCCESS";
}

export const authService = {
  register,
  login,
  syncGoogleSession,
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
