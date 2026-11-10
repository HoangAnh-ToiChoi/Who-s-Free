import { isRealDate } from "./availability.validation.js";

export const MAX_WINDOW_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

const toUtcMs = (value) => Date.parse(`${value}T00:00:00Z`);

/**
 * Khoảng ngày khảo sát khi tạo phiên. Trả về thông báo lỗi hoặc null.
 * Không gửi cả hai ngày → hợp lệ (client cũ); `today` cho phép lệch 1 ngày vì máy chủ chạy UTC còn người dùng ở UTC+7.
 */
export function getDateWindowError({ startDate, endDate } = {}, today = new Date()) {
  if (startDate == null && endDate == null) return null;
  if (!isRealDate(startDate) || !isRealDate(endDate)) return "Ngày bắt đầu và kết thúc phải là ngày hợp lệ dạng YYYY-MM-DD";
  const start = toUtcMs(startDate);
  const end = toUtcMs(endDate);
  if (end < start) return "Ngày kết thúc phải từ ngày bắt đầu trở đi";
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  if (start < todayUtc - DAY_MS) return "Ngày bắt đầu không được ở trong quá khứ";
  if ((end - start) / DAY_MS + 1 > MAX_WINDOW_DAYS) return `Khoảng khảo sát tối đa ${MAX_WINDOW_DAYS} ngày`;
  return null;
}

export const MAX_NOTE_LENGTH = 500;

/** Ghi chú của trưởng nhóm cho phiên (lưu ở sessions.description). Chuỗi rỗng = xoá ghi chú. */
export function getNoteError(note) {
  if (typeof note !== "string") return "Ghi chú phải là chuỗi";
  if (note.trim().length > MAX_NOTE_LENGTH) return `Ghi chú tối đa ${MAX_NOTE_LENGTH} ký tự`;
  return null;
}
