/**
 * TokenManager - Quản lý Access Token trong bộ nhớ tạm thời (In-Memory Only)
 * 
 * Tuân thủ tiêu chuẩn bảo mật Single Responsibility Principle (SRP) & Zero-XSS:
 * - Access Token chỉ tồn tại trong JavaScript Memory, TUYỆT ĐỐI KHÔNG lưu vào localStorage/sessionStorage.
 * - Khi người dùng reload trang (F5), memory token bị xóa; AuthContext/backendApi sẽ tự động
 *   dùng HttpOnly Refresh Cookie gọi /api/auth/refresh để lấy Access Token mới (Zero-Wait State Transfer).
 */

let inMemoryAccessToken = null;

export const tokenManager = {
  /**
   * Lấy Access Token hiện tại trong memory
   * @returns {string|null}
   */
  getAccessToken() {
    return inMemoryAccessToken;
  },

  /**
   * Lưu Access Token mới vào memory
   * @param {string|null} token
   */
  setAccessToken(token) {
    inMemoryAccessToken = token || null;
  },

  /**
   * Xóa Access Token khỏi memory khi logout hoặc phiên hết hạn
   */
  clearAccessToken() {
    inMemoryAccessToken = null;
  },

  /**
   * Kiểm tra có token trong memory hay không
   * @returns {boolean}
   */
  hasAccessToken() {
    return Boolean(inMemoryAccessToken);
  },
};

export default tokenManager;
