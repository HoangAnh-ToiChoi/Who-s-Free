import { useEffect, useRef, useState } from "react";
import { notificationService } from "~/service/notificationService/notificationService";

const POLL_INTERVAL_MS = 30_000;

/**
 * useNotifications - Lấy thông báo bằng polling (30s/lần, chỉ khi tab đang hiển thị,
 * và lấy lại ngay khi người dùng quay lại tab).
 * Lỗi khi polling không hiện toast: set `error` (UI tự hiện dấu hiệu nhỏ) và console.warn đúng một lần
 * mỗi lần chuyển từ ổn sang lỗi; lần sau thử lại, thành công thì `error` tự xoá.
 */
export function useNotifications({ enabled = true } = {}) {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState(false);
  const failingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;

    const controller = new AbortController();
    const load = async () => {
      if (document.hidden) return;
      try {
        const data = await notificationService.list({ signal: controller.signal });
        failingRef.current = false;
        setError(false);
        setItems(data.items || []);
        setUnreadCount(data.unreadCount || 0);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (!failingRef.current) {
          failingRef.current = true;
          console.warn("[notifications] Không tải được thông báo:", err?.message || err);
        }
        setError(true);
      }
    };

    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", load);

    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [enabled]);

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    setUnreadCount(0);
    try {
      await notificationService.markAllRead();
    } catch {
      // lần polling kế tiếp sẽ đồng bộ lại số chưa đọc
    }
  };

  return { items, unreadCount, error, markAllRead };
}

export default useNotifications;
