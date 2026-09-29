/**
 * timeUtils.js - Tập hợp các hàm toán học và định dạng thời gian độc lập (Pure Functions)
 * Dễ dàng unit test và tái sử dụng cho các module khác.
 */

export const START_HOUR = 0;
export const END_HOUR = 23;
export const HOUR_HEIGHT = 64; // Chiều cao 1 giờ = 64px
export const HALF_HOUR_HEIGHT = 32; // Chiều cao 30 phút = 32px

/**
 * Chuyển số phút sang chuỗi "HH:mm" (ví dụ: 540 -> "09:00", 690 -> "11:30")
 * @param {number} minutes
 * @returns {string}
 */
export function minutesToTimeString(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Chuyển chuỗi "HH:mm" sang số phút
 * @param {string} timeStr
 * @returns {number}
 */
export function timeStringToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Định dạng thời lượng giữa 2 mốc phút (ví dụ: "2h 30m" hoặc "2h" hoặc "30m")
 * @param {number} startMinutes
 * @param {number} endMinutes
 * @returns {string}
 */
export function formatDuration(startMinutes, endMinutes) {
  const total = Math.max(0, endMinutes - startMinutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/**
 * Tính toán tọa độ Y (top) và chiều cao (height) cho một khối thời gian trên lưới
 * @param {number} startMinutes
 * @param {number} endMinutes
 * @returns {{ top: number, height: number }}
 */
export function calculateSlotGeometry(startMinutes, endMinutes) {
  const top = ((startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;
  return {
    top: Math.max(0, top),
    height: Math.max(HALF_HOUR_HEIGHT, height),
  };
}

/**
 * Chuyển đổi vị trí Y chuột trên cột ngày thành số phút (Snap theo 30 phút)
 * @param {number} offsetY - Khoảng cách từ đỉnh cột đến con trỏ chuột
 * @returns {number}
 */
export function yOffsetToMinutes(offsetY) {
  const stepIndex = Math.floor(offsetY / HALF_HOUR_HEIGHT);
  const minutes = START_HOUR * 60 + stepIndex * 30;
  return Math.min(Math.max(START_HOUR * 60, minutes), (END_HOUR + 1) * 60);
}

/**
 * Tạo danh sách các khung giờ cho dropdown START & END
 * @param {number} startHour
 * @param {number} endHour
 * @returns {string[]}
 */
export function generateTimeOptions(startHour = START_HOUR, endHour = END_HOUR + 1) {
  const options = [];
  for (let h = startHour; h <= endHour; h++) {
    options.push(`${String(h).padStart(2, "0")}:00`);
    if (h < endHour) {
      options.push(`${String(h).padStart(2, "0")}:30`);
    }
  }
  return options;
}
