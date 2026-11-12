// Chính sách khi lưu lịch rảnh thất bại. Module thuần để test.
export const RETRY_DELAYS_MS = [1000, 3000, 7000];

/**
 * "locked": server từ chối vì phiên đã chốt → khớp lại theo slot server gửi kèm, không thử lại.
 * "finalizing": trưởng nhóm đang mở bảng Chốt lịch → khớp lại như "locked", báo liên hệ trưởng nhóm.
 * "retry":  lỗi tạm thời (mất mạng, server ngủ/quá tải, rate limit) → thử lại có giãn cách.
 * "fatal":  lỗi dữ liệu/quyền (4xx khác) → thử lại cũng vô ích, báo người dùng.
 */
export function classifySaveError(error) {
  if (error?.code === "SESSION_FINALIZED" || error?.details?.status === "finalized") return "locked";
  if (error?.code === "SESSION_FINALIZING" || error?.details?.status === "finalizing") return "finalizing";
  const status = Number(error?.status) || 0;
  if (status === 0 || status === 408 || status === 429 || status >= 500) return "retry";
  return "fatal";
}
