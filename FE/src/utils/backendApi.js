import tokenManager from "./tokenManager";
import { fetchWithWake } from "./serverWake";

const API_BASE_URL = (
  import.meta.env.VITE_BACKEND_API_BASE_URL ||
  import.meta.env.VITE_BASE_API ||
  "/api"
).replace(/\/$/, "");

const NO_REFRESH_AUTH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/google/session",
  "/auth/refresh",
  "/auth/logout",
  "/auth/forgot-password",
  "/auth/verify-otp",
  "/auth/reset-password",
];

const HEALTH_URL = `${API_BASE_URL}/health`;

/** fetch có xử lý máy chủ ngủ (báo chờ + tự thử lại), dùng cho mọi lệnh gọi Backend. */
const apiFetch = (url, init) => fetchWithWake(url, init, { healthUrl: HEALTH_URL });

let refreshInFlight = null;
const REFRESH_RACE_RETRY_MS = 500;

// Báo cho AuthContext khi phiên đăng nhập kết thúc giữa chừng (bị thiết bị cùng loại thay, hoặc làm mới thất bại)
const sessionEndedListeners = new Set();

/** Đăng ký nghe "phiên đăng nhập đã kết thúc"; listener nhận mã lỗi (vd SESSION_REVOKED). Trả về hàm huỷ đăng ký. */
export function onSessionEnded(listener) {
  sessionEndedListeners.add(listener);
  return () => sessionEndedListeners.delete(listener);
}

function notifySessionEnded(code) {
  tokenManager.clearAccessToken();
  sessionEndedListeners.forEach((listener) => listener(code));
}

/** Địa chỉ kiểm tra máy chủ đã sẵn sàng (dùng để đánh thức / chờ). */
export const backendHealthUrl = () => HEALTH_URL;

/** Absolute backend URL for browser navigations (e.g. OAuth redirects) that bypass fetch. */
export function backendUrl(path) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export class BackendApiError extends Error {
  constructor(message, { status, code, details, response } = {}) {
    super(message || "Backend request failed");
    this.name = "BackendApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.response = response;
  }
}

function normalizePath(path) {
  const value = String(path || "");
  if (API_BASE_URL.endsWith("/api") && value.startsWith("/api/")) {
    return value.slice(4);
  }
  return value.startsWith("/") ? value : `/${value}`;
}

function isRefreshExempt(path) {
  const pathname = normalizePath(path).split("?", 1)[0];
  return NO_REFRESH_AUTH_PATHS.some((exempt) => pathname === exempt || pathname.startsWith(`${exempt}/`));
}

async function readPayload(response) {
  if (response.status === 204) return null;
  return response.json().catch(() => null);
}

async function postRefresh() {
  const response = await apiFetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  return { response, payload: await readPayload(response) };
}

/** One shared refresh operation for every frontend API caller. */
export function requestTokenRefresh() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      let { response, payload } = await postRefresh();
      // Tab khác vừa dùng cùng refresh token (mở 2 tab cùng lúc): cookie đã được thay bằng token mới,
      // đợi một chút rồi thử lại đúng một lần thay vì đăng xuất người dùng.
      if (response.status === 401 && payload?.error === "INVALID_REFRESH_TOKEN") {
        await new Promise((resolve) => setTimeout(resolve, REFRESH_RACE_RETRY_MS));
        ({ response, payload } = await postRefresh());
      }
      const accessToken = payload?.data?.accessToken || payload?.accessToken;

      if (!response.ok || payload?.success === false || !accessToken) {
        throw new BackendApiError(
          payload?.message || "Làm mới phiên đăng nhập thất bại",
          {
            status: response.status || 401,
            code: payload?.error || "REFRESH_FAILED",
            response: payload,
          }
        );
      }

      tokenManager.setAccessToken(accessToken);
      return accessToken;
    } catch (error) {
      tokenManager.clearAccessToken();
      throw error;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/** Shared request, response parsing, Bearer auth, refresh and one-time retry. */
export async function backendRequest(
  path,
  {
    method = "GET",
    body,
    signal,
    headers: customHeaders = {},
    credentials = "omit",
    responseType = "json",
    keepalive = false,
    _retried = false,
  } = {}
) {
  const headers = {
    Accept: "application/json",
    ...customHeaders,
  };
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const token = tokenManager.getAccessToken();
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const normalizedPath = normalizePath(path);
  const response = await apiFetch(`${API_BASE_URL}${normalizedPath}`, {
    method,
    headers,
    credentials,
    signal,
    // keepalive: request vẫn được gửi khi trang đang đóng/rời đi (dùng cho lần lưu lịch cuối)
    keepalive,
    body:
      body === undefined || isFormData || typeof body === "string"
        ? body
        : JSON.stringify(body),
  });

  // Tải file nhị phân (vd: xlsx): trả về { blob, fileName } khi thành công
  if (responseType === "blob" && response.ok) {
    const disposition = response.headers.get("Content-Disposition") || "";
    const fileName = disposition.match(/filename="?([^";]+)"?/i)?.[1] || null;
    return { blob: await response.blob(), fileName };
  }

  const payload = await readPayload(response);

  if (!response.ok || payload?.success === false) {
    const error = new BackendApiError(
      payload?.message || `Request failed (${response.status})`,
      {
        status: response.status,
        code: payload?.error,
        details: payload?.details,
        response: payload,
      }
    );

    // Tài khoản vừa đăng nhập trên thiết bị khác cùng loại: phiên này đã bị thay, làm mới cũng không được
    if (response.status === 401 && payload?.error === "SESSION_REVOKED") {
      notifySessionEnded("SESSION_REVOKED");
      throw error;
    }

    if (response.status === 401 && !_retried && !isRefreshExempt(path)) {
      try {
        await requestTokenRefresh();
        return await backendRequest(path, {
          method,
          body,
          signal,
          headers: customHeaders,
          credentials,
          responseType,
          _retried: true,
        });
      } catch (refreshError) {
        if (refreshError?.status === 401) notifySessionEnded(refreshError.code);
        else tokenManager.clearAccessToken();
        throw refreshError;
      }
    }

    throw error;
  }

  return payload?.data ?? payload;
}

export default backendRequest;
