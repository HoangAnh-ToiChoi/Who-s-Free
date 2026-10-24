const DEFAULT_TTL_MS = 5000;
const store = new Map();

/**
 * Cache ngắn hạn cho lệnh tải dữ liệu: gộp các lần gọi trùng nhau và cho phép tải trước.
 * Dữ liệu chỉ được dùng lại trong `ttl` ms kể từ lúc tải xong; lỗi không bao giờ bị lưu lại.
 */
export function cachedFetch(key, fetcher, { ttl = DEFAULT_TTL_MS, fresh = false } = {}) {
  const hit = store.get(key);
  if (!fresh && hit && (hit.settledAt === null || Date.now() - hit.settledAt < hit.ttl)) {
    return hit.promise;
  }

  const entry = { promise: null, settledAt: null, value: undefined, ttl };
  entry.promise = fetcher().then(
    (value) => {
      entry.value = value;
      entry.settledAt = Date.now();
      return value;
    },
    (error) => {
      if (store.get(key) === entry) store.delete(key);
      throw error;
    },
  );
  store.set(key, entry);
  return entry.promise;
}

/** Lấy ngay (đồng bộ) dữ liệu đã tải xong và còn hạn, nếu không có trả về undefined. */
export function peekCached(key) {
  const hit = store.get(key);
  if (hit && hit.settledAt !== null && Date.now() - hit.settledAt < hit.ttl) return hit.value;
  return undefined;
}

/** Xoá mọi mục có key bắt đầu bằng prefix (dùng sau khi ghi dữ liệu). */
export function invalidateCached(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
