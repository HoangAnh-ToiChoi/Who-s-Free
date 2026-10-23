// Xử lý máy chủ "ngủ" (gói hosting miễn phí): báo người dùng chờ, đợi máy chủ dậy rồi tự thử lại.
// Module thuần (không phụ thuộc React/Vite) để dùng chung cho backendApi, đăng nhập Google và test.

const DEFAULTS = { slowMs: 4000, intervalMs: 2500, maxWaitMs: 90000, pingTimeoutMs: 4000 };
const RETRYABLE_STATUS = new Set([502, 503, 504]);

// ── Trạng thái "đang đánh thức máy chủ" để giao diện đăng ký theo dõi ───────
const listeners = new Set();
let wakingCount = 0;

function emit() {
  listeners.forEach((listener) => listener());
}

export const serverWakeStore = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => wakingCount > 0,
};

function beginWaking() {
  wakingCount += 1;
  emit();
}

function endWaking() {
  wakingCount = Math.max(0, wakingCount - 1);
  emit();
}

// ── Kiểm tra / chờ máy chủ ──────────────────────────────────────────────────
export async function pingBackend(healthUrl, timeoutMs = DEFAULTS.pingTimeoutMs) {
  try {
    const response = await fetch(healthUrl, { cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
    return response.ok;
  } catch {
    return false;
  }
}

/** Đợi tới khi máy chủ phản hồi (hoặc hết thời gian chờ). Trả về true nếu máy chủ đã sẵn sàng. */
export async function waitForBackend(healthUrl, options = {}) {
  const { intervalMs, maxWaitMs, pingTimeoutMs } = { ...DEFAULTS, ...options };
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    if (await pingBackend(healthUrl, pingTimeoutMs)) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

/** Gọi ngầm khi mở web để máy chủ kịp dậy trước khi người dùng thao tác. */
export function warmUpBackend(healthUrl) {
  return pingBackend(healthUrl, DEFAULTS.maxWaitMs).catch(() => false);
}

/**
 * fetch có xử lý máy chủ ngủ:
 * - quá slowMs chưa có phản hồi -> bật trạng thái "đang chuẩn bị" cho giao diện
 * - lỗi mạng / 502 / 503 / 504 -> kiểm tra máy chủ; nếu đang ngủ thì đợi dậy rồi gọi lại 1 lần
 * - máy chủ vẫn sống mà request lỗi: GET được gọi lại 1 lần, các method khác trả lỗi gốc (tránh gửi trùng thao tác ghi)
 */
export async function fetchWithWake(url, init = {}, { healthUrl, ...options } = {}) {
  const config = { ...DEFAULTS, ...options };
  const isRead = !init.method || String(init.method).toUpperCase() === "GET";
  let marked = false;
  const mark = () => {
    if (!marked) {
      marked = true;
      beginWaking();
    }
  };
  const slowTimer = setTimeout(mark, config.slowMs);

  try {
    let firstResponse = null;
    let firstError = null;
    try {
      firstResponse = await fetch(url, init);
      if (!RETRYABLE_STATUS.has(firstResponse.status)) return firstResponse;
    } catch (error) {
      if (init.signal?.aborted) throw error;
      firstError = error;
    }

    mark();
    const wasUp = healthUrl ? await pingBackend(healthUrl, config.pingTimeoutMs) : false;
    if (wasUp && !isRead) {
      if (firstResponse) return firstResponse;
      throw firstError;
    }
    if (!wasUp && healthUrl) await waitForBackend(healthUrl, config);
    return await fetch(url, init);
  } finally {
    clearTimeout(slowTimer);
    if (marked) endWaking();
  }
}
