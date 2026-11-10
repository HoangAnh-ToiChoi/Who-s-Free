// Lưới 7 ngày × 48 ô 30 phút; slot hợp lệ phải khớp đúng các mốc của lưới.
export const MAX_SLOTS = 336;
export const SLOT_STEP_MINUTES = 30;
export const DAY_MINUTES = 24 * 60;
export const MAX_NOTE_LENGTH = 500;
export const MAX_LABEL_LENGTH = 50;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isRealDate = (value) => {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const isGridMinute = (value) =>
  Number.isInteger(value) && value >= 0 && value <= DAY_MINUTES && value % SLOT_STEP_MINUTES === 0;

const isOptionalText = (value, max) =>
  value === undefined || value === null || (typeof value === "string" && value.length <= max);

function slotError(slot) {
  if (!slot || typeof slot !== "object" || Array.isArray(slot)) return "phải là object";
  if (!Number.isInteger(slot.dayIndex) || slot.dayIndex < 0 || slot.dayIndex > 6) return "dayIndex phải từ 0 đến 6";
  if (!isRealDate(slot.dateStr)) return "dateStr phải là ngày hợp lệ dạng YYYY-MM-DD";
  if (!isGridMinute(slot.startMinutes) || !isGridMinute(slot.endMinutes)) {
    return `giờ phải là số phút từ 0 đến ${DAY_MINUTES}, bội số của ${SLOT_STEP_MINUTES}`;
  }
  if (slot.startMinutes >= slot.endMinutes) return "giờ kết thúc phải sau giờ bắt đầu";
  if (!isOptionalText(slot.note, MAX_NOTE_LENGTH)) return `ghi chú tối đa ${MAX_NOTE_LENGTH} ký tự`;
  if (!isOptionalText(slot.label, MAX_LABEL_LENGTH)) return `nhãn tối đa ${MAX_LABEL_LENGTH} ký tự`;
  return null;
}

function findOverlap(slots) {
  const byDate = new Map();
  slots.forEach((slot, index) => {
    if (!byDate.has(slot.dateStr)) byDate.set(slot.dateStr, []);
    byDate.get(slot.dateStr).push({ ...slot, index });
  });
  for (const daySlots of byDate.values()) {
    daySlots.sort((a, b) => a.startMinutes - b.startMinutes);
    for (let i = 1; i < daySlots.length; i += 1) {
      if (daySlots[i].startMinutes < daySlots[i - 1].endMinutes) return [daySlots[i - 1].index, daySlots[i].index];
    }
  }
  return null;
}

/**
 * Kiểm tra payload lưu lịch rảnh. Trả về thông báo lỗi (tiếng Việt) hoặc null nếu hợp lệ.
 * Chặn dữ liệu rác trước khi chạm DB: tránh lỗi 500 do kiểu/ngày sai và slot chồng nhau lọt vào lịch.
 */
export function getSlotsValidationError(slots) {
  if (!Array.isArray(slots)) return "slots phải là mảng";
  if (slots.length > MAX_SLOTS) return `Tối đa ${MAX_SLOTS} slots mỗi lần lưu`;
  for (let i = 0; i < slots.length; i += 1) {
    const error = slotError(slots[i]);
    if (error) return `Slot #${i + 1}: ${error}`;
  }
  const overlap = findOverlap(slots);
  if (overlap) return `Slot #${overlap[0] + 1} và #${overlap[1] + 1} bị chồng giờ nhau`;
  return null;
}
