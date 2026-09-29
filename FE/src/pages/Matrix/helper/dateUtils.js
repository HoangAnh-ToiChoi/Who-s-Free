/**
 * dateUtils.js - Tiện ích toán học xử lý ngày tháng, chu kỳ tuần chuẩn xác (Pure Functions)
 */

const DAY_NAMES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

/**
 * Lấy ngày Thứ Hai đầu tuần của một mốc Date bất kỳ
 * @param {Date} date
 * @returns {Date}
 */
export function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  // Chủ nhật là 0 trong JS, quy ước Thứ 2 là ngày bắt đầu tuần
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Tạo danh sách 7 ngày trong tuần từ ngày Thứ Hai
 * @param {Date} mondayDate
 * @returns {Array<{ dayIndex: number, dayName: string, dateNum: string, dateStr: string, isToday: boolean }>}
 */
export function calculateWeekDates(mondayDate) {
  const today = new Date();
  const todayStr = toISODateString(today);

  return DAY_NAMES.map((name, idx) => {
    const d = new Date(mondayDate);
    d.setDate(mondayDate.getDate() + idx);

    const monthShort = MONTH_NAMES_SHORT[d.getMonth()];
    const dayOfMonth = d.getDate();
    const dateStr = toISODateString(d);

    return {
      dayIndex: idx,
      dayName: name,
      dateNum: `${monthShort} ${dayOfMonth}`,
      dateStr,
      isToday: dateStr === todayStr,
    };
  });
}

/**
 * Chuyển Date sang chuỗi "YYYY-MM-DD"
 * @param {Date} date
 * @returns {string}
 */
export function toISODateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Tạo chuỗi tiêu đề tuần (ví dụ: "Oct 20 – Oct 26, 2026")
 * @param {Date} mondayDate
 * @returns {string}
 */
export function formatWeekRangeLabel(mondayDate) {
  const sundayDate = new Date(mondayDate);
  sundayDate.setDate(mondayDate.getDate() + 6);

  const startMonth = MONTH_NAMES_SHORT[mondayDate.getMonth()];
  const endMonth = MONTH_NAMES_SHORT[sundayDate.getMonth()];
  const startDay = mondayDate.getDate();
  const endDay = sundayDate.getDate();
  const year = sundayDate.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} – ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}
