/**
 * dateUtils.js - Tiện ích toán học xử lý ngày tháng, chu kỳ tuần chuẩn xác (Pure Functions)
 */

const DAY_NAMES = {
  en: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
  vi: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
};
const langKey = (lang) => (String(lang || "en").startsWith("vi") ? "vi" : "en");
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
export function calculateWeekDates(mondayDate, lang = "en") {
  const today = new Date();
  const todayStr = toISODateString(today);
  const isVi = langKey(lang) === "vi";

  return DAY_NAMES[langKey(lang)].map((name, idx) => {
    const d = new Date(mondayDate);
    d.setDate(mondayDate.getDate() + idx);

    const monthShort = MONTH_NAMES_SHORT[d.getMonth()];
    const dayOfMonth = d.getDate();
    const dateStr = toISODateString(d);

    return {
      dayIndex: idx,
      dayName: name,
      // vi: "3/11" (ngắn, không bị xuống dòng trên mobile); en: "Nov 3"
      dateNum: isVi ? `${dayOfMonth}/${d.getMonth() + 1}` : `${monthShort} ${dayOfMonth}`,
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
export function formatWeekRangeLabel(mondayDate, lang = "en") {
  const sundayDate = new Date(mondayDate);
  sundayDate.setDate(mondayDate.getDate() + 6);

  if (langKey(lang) === "vi") {
    const [sm, em] = [mondayDate.getMonth() + 1, sundayDate.getMonth() + 1];
    const start = sm === em ? `${mondayDate.getDate()}` : `${mondayDate.getDate()}/${sm}`;
    return `${start} – ${sundayDate.getDate()}/${em}/${sundayDate.getFullYear()}`;
  }

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
