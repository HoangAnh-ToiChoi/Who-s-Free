import { backendRequest } from "~/utils/backendApi";

/**
 * notificationService - Thông báo của người dùng (lời mời nhóm, lịch đã chốt)
 */
export const notificationService = {
  /** @returns {Promise<{ items: Array, unreadCount: number }>} */
  list({ signal } = {}) {
    return backendRequest("/notifications", { signal });
  },

  /** Đánh dấu đã xem toàn bộ (số chưa đọc về 0). */
  markAllRead() {
    return backendRequest("/notifications/read", { method: "POST" });
  },
};

export default notificationService;
