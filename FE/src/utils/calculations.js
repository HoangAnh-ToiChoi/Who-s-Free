/**
 * Utility functions for calculations across the application.
 */

/**
 * Tính phần trăm an toàn giữa giá trị hiện tại và tổng số, giới hạn trong khoảng [0, max].
 * Mặc định tối đa 100%.
 *
 * @param {number} current - Giá trị hiện tại (vd: số người đã phản hồi, số thành viên)
 * @param {number} total - Tổng số mục tiêu (vd: sức chứa, tổng thành viên)
 * @param {number} [max=100] - Ngưỡng tối đa trả về
 * @returns {number} Phần trăm (số nguyên đã làm tròn)
 */
export function calcPercentage(current, total, max = 100) {
  if (!total || total <= 0) return 0;
  if (!current || current <= 0) return 0;
  return Math.min(Math.max(Math.round((current / total) * 100), 0), max);
}

/**
 * Giới hạn một giá trị nằm trong khoảng [min, max].
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
