import { backendRequest } from "~/utils/backendApi";

/**
 * invitationService - Giao tiếp dữ liệu Lời mời tham gia nhóm với Backend API
 *
 * Single Source of Truth:
 *   - Lấy thông tin preview công khai từ GET /api/invitations/:token
 *   - Chấp nhận lời mời từ POST /api/invitations/:token/accept
 */
export const invitationService = {
  /**
   * Xem trước thông tin lời mời (Public endpoint)
   * @param {string} token
   * @param {Object} options - { signal }
   * @returns {Promise<Object>}
   */
  async getInvitationPreview(token, { signal } = {}) {
    if (!token) throw new Error("Invitation token is required");
    return backendRequest(`/invitations/${encodeURIComponent(token)}`, { signal });
  },

  /**
   * Email được mời đã có tài khoản chưa (cần token lời mời hợp lệ)
   * @returns {Promise<{ email: string, hasAccount: boolean }>}
   */
  async getAccountStatus(token, { signal } = {}) {
    if (!token) throw new Error("Invitation token is required");
    return backendRequest(`/invitations/${encodeURIComponent(token)}/account`, { signal });
  },

  /**
   * Chấp nhận lời mời tham gia nhóm (Yêu cầu đã đăng nhập)
   * @param {string} token
   * @returns {Promise<{ member: Object, group: Object }>}
   */
  async acceptInvitation(token) {
    if (!token) throw new Error("Invitation token is required");
    return backendRequest(`/invitations/${encodeURIComponent(token)}/accept`, {
      method: "POST",
    });
  },
};

export default invitationService;
