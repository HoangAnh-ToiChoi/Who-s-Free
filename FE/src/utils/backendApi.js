const API_BASE_URL = (import.meta.env.VITE_BACKEND_API_BASE_URL || "/api").replace(/\/$/, "");

export class BackendApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message || "Backend request failed");
    this.name = "BackendApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Sends an authenticated request to the backend and unwraps the standard API envelope. */
export async function backendRequest(path, { method = "GET", body, signal } = {}) {
  const headers = { Accept: "application/json" };
  let token = null;
  try {
    if (typeof window !== "undefined") token = localStorage.getItem("accessToken");
  } catch {
    // Cookie authentication can still work when browser storage is unavailable.
  }

  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    signal,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    throw new BackendApiError(payload?.message || `Request failed (${response.status})`, {
      status: response.status,
      code: payload?.error,
      details: payload?.details,
    });
  }

  return payload?.data ?? payload;
}
