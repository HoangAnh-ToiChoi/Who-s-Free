import { useEffect, useState } from "react";
import { notificationService } from "~/service/notificationService/notificationService";

const POLL_INTERVAL_MS = 30_000;

/**
 * useNotifications - Lấy thông báo bằng polling (30s/lần, chỉ khi tab đang hiển thị,
 * và lấy lại ngay khi người dùng quay lại tab).
 * Lỗi mạng khi polling bị bỏ qua, lần sau sẽ thử lại.
 */
export function useNotifications({ enabled = true } = {}) {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;

    const controller = new AbortController();
    const load = async () => {
      if (document.hidden) return;
      try {
        const data = await notificationService.list({ signal: controller.signal });
        setItems(data.items || []);
        setUnreadCount(data.unreadCount || 0);
      } catch {
        // polling nền: bỏ qua lỗi, lần sau thử lại
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

  return { items, unreadCount, markAllRead };
}

export default useNotifications;
