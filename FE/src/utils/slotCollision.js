/**
 * slotCollision.js - Thuật toán kiểm tra và xử lý va chạm khung giờ (Collision Detection)
 *
 * Tối ưu hóa hiệu năng:
 * - Toán tử số nguyên thuần túy (startMinutes, endMinutes), độ phức tạp O(N).
 * - Tái sử dụng độc lập cho cả Drag to Select, Resize, và Slot Popover validation.
 */

/**
 * Kiểm tra 2 khoảng thời gian [startA, endA] và [startB, endB] có giao thoa hay không.
 * Hai khoảng giao nhau khi: max(startA, startB) < min(endA, endB)
 *
 * @param {number} startA - Phút bắt đầu khoảng A
 * @param {number} endA   - Phút kết thúc khoảng A
 * @param {number} startB - Phút bắt đầu khoảng B
 * @param {number} endB   - Phút kết thúc khoảng B
 * @returns {boolean}
 */
export function isIntervalOverlapping(startA, endA, startB, endB) {
  return Math.max(startA, startB) < Math.min(endA, endB);
}

/**
 * Kiểm tra xem 1 mốc phút cụ thể có nằm lọt vào bên trong một slot hay không.
 * Điểm nằm trong khi: minutes >= slot.startMinutes && minutes < slot.endMinutes
 *
 * @param {number} minutes
 * @param {Object} slot
 * @returns {boolean}
 */
export function isMinuteInSlot(minutes, slot) {
  if (!slot) return false;
  return minutes >= slot.startMinutes && minutes < slot.endMinutes;
}

/**
 * Kiểm tra xem 1 mốc phút có nằm trong bất kỳ slot nào của ngày dayIndex hay không.
 *
 * @param {number} dayIndex - Chỉ số ngày (0-6)
 * @param {number} minutes  - Mốc phút trong ngày
 * @param {Array} slots     - Danh sách tất cả slots
 * @param {string|null} ignoreSlotId - Bỏ qua slot này nếu đang kiểm tra chính nó
 * @returns {boolean}
 */
export function isMinuteInAnySlot(dayIndex, minutes, slots = [], ignoreSlotId = null) {
  return slots.some(
    (slot) =>
      slot.id !== ignoreSlotId &&
      slot.dayIndex === dayIndex &&
      isMinuteInSlot(minutes, slot)
  );
}

/**
 * Tìm slot đầu tiên bị va chạm với khoảng [startMinutes, endMinutes] trên ngày dayIndex.
 *
 * @param {number} dayIndex
 * @param {number} startMinutes
 * @param {number} endMinutes
 * @param {Array} slots
 * @param {string|null} ignoreSlotId
 * @returns {Object|null} Slot bị va chạm, hoặc null nếu an toàn
 */
export function findCollidingSlot(
  dayIndex,
  startMinutes,
  endMinutes,
  slots = [],
  ignoreSlotId = null
) {
  return (
    slots.find(
      (slot) =>
        slot.id !== ignoreSlotId &&
        slot.dayIndex === dayIndex &&
        isIntervalOverlapping(startMinutes, endMinutes, slot.startMinutes, slot.endMinutes)
    ) || null
  );
}

/**
 * Kiểm tra xem khoảng [startMinutes, endMinutes] trên một hoặc nhiều ngày có bị va chạm không.
 *
 * @param {number|number[]} dayIndices - Một dayIndex hoặc mảng các dayIndices
 * @param {number} startMinutes
 * @param {number} endMinutes
 * @param {Array} slots
 * @param {string|null} ignoreSlotId
 * @returns {boolean} True nếu CÓ va chạm với ít nhất 1 slot đã có
 */
export function hasSlotCollision(
  dayIndices,
  startMinutes,
  endMinutes,
  slots = [],
  ignoreSlotId = null
) {
  const days = Array.isArray(dayIndices) ? dayIndices : [dayIndices];
  return days.some((dIdx) =>
    slots.some(
      (slot) =>
        slot.id !== ignoreSlotId &&
        slot.dayIndex === dIdx &&
        isIntervalOverlapping(startMinutes, endMinutes, slot.startMinutes, slot.endMinutes)
    )
  );
}

/**
 * Thuật toán Clamp phạm vi kéo (Clamp Drag Boundary):
 * Khi người dùng kéo từ originMinutes về hướng con trỏ chuột,
 * hàm này tự động giới hạn con trỏ dừng lại ngay trước mép của slot gần nhất đã tồn tại,
 * không cho phép vùng kéo lấn qua slot đã có.
 *
 * @param {number} originMinutes - Điểm bắt đầu click chuột
 * @param {number} targetMinutes - Điểm chuột hiện tại
 * @param {number[]} dayIndices   - Các ngày đang được kéo qua
 * @param {Array} slots          - Danh sách slots hiện có
 * @returns {number} Mốc phút đã được clamp an toàn
 */
export function clampDragBoundary(originMinutes, targetMinutes, dayIndices, slots = []) {
  const days = Array.isArray(dayIndices) ? dayIndices : [dayIndices];
  const relevantSlots = slots.filter((s) => days.includes(s.dayIndex));

  if (targetMinutes >= originMinutes) {
    // Đang kéo xuống dưới (originMinutes -> targetMinutes)
    // Tìm slot có startMinutes >= originMinutes nằm gần nhất phía dưới
    let maxAllowedEnd = targetMinutes;
    for (const slot of relevantSlots) {
      if (slot.startMinutes >= originMinutes) {
        if (slot.startMinutes < maxAllowedEnd) {
          maxAllowedEnd = slot.startMinutes;
        }
      }
    }
    return maxAllowedEnd;
  } else {
    // Đang kéo ngược lên trên (targetMinutes <- originMinutes)
    // Tìm slot có endMinutes <= originMinutes nằm gần nhất phía trên
    let minAllowedStart = targetMinutes;
    for (const slot of relevantSlots) {
      if (slot.endMinutes <= originMinutes) {
        if (slot.endMinutes > minAllowedStart) {
          minAllowedStart = slot.endMinutes;
        }
      }
    }
    return minAllowedStart;
  }
}
