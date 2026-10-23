import { backendRequest } from "~/utils/backendApi";

/**
 * joinService - Giao tiếp dữ liệu tham gia nhóm qua liên kết mời công khai
 *
 * Single Source of Truth:
 *   - Lấy thông tin preview công khai từ GET /api/join/:token
 *   - Tham gia nhóm từ POST /api/join/:token (Yêu cầu đăng nhập)
 */
export const joinService = {
  /**
   * Xem trước thông tin nhóm từ link mời (Public endpoint)
   * @param {string} token
   * @param {Object} options - { signal }
   * @returns {Promise<Object>}
   */
  async getJoinPreview(token, { signal } = {}) {
    if (!token) throw new Error("Join token is required");
    return backendRequest(`/join/${encodeURIComponent(token)}`, { signal });
  },

  /**
   * Tham gia nhóm từ link mời (Yêu cầu đã đăng nhập)
   * @param {string} token
   * @returns {Promise<{ member: Object, group: Object }>}
   */
  async joinGroup(token) {
    if (!token) throw new Error("Join token is required");
    return backendRequest(`/join/${encodeURIComponent(token)}`, {
      method: "POST",
    });
  },
};

export default joinService;
