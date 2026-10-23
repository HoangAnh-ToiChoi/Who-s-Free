// Tính các khung giờ mà nhóm đã chọn để Lead chọn khi chốt lịch (lưới nền 30 phút).

const CELL = 30;
const WEEKDAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

export function formatMinutes(total) {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function formatRange(start, end) {
  return `${formatMinutes(start)} - ${formatMinutes(end)}`;
}

/** "2026-09-08" -> "Thứ Ba 8/9" */
export function formatDateLabel(dateStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d}/${m}`;
}

/**
 * Các ô 30 phút mà ít nhất 1 thành viên đã chọn, kèm số người rảnh.
 * @param {Array<{ memberId: string, slots: Array<{ dateStr: string, startMinutes: number, endMinutes: number }> }>} members
 * @returns {Array<{ date: string, start: number, end: number, count: number }>} sắp theo ngày, giờ
 */
export function buildSelectedCells(members = []) {
  const byCell = new Map();
  for (const member of members) {
    for (const slot of member.slots || []) {
      const date = String(slot.dateStr || "").slice(0, 10);
      if (!date) continue;
      for (let m = Math.floor(slot.startMinutes / CELL) * CELL; m < slot.endMinutes; m += CELL) {
        const key = `${date}|${m}`;
        if (!byCell.has(key)) byCell.set(key, { date, start: m, end: m + CELL, people: new Set() });
        byCell.get(key).people.add(member.memberId);
      }
    }
  }
  return [...byCell.values()]
    .map(({ people, ...cell }) => ({ ...cell, count: people.size }))
    .sort((a, b) => (a.date === b.date ? a.start - b.start : a.date < b.date ? -1 : 1));
}

/**
 * Cập nhật khung giờ đang chọn khi bấm vào một ô:
 * - chưa chọn / khác ngày / không liền mạch -> chọn riêng ô đó
 * - bấm đúng ô duy nhất đang chọn -> bỏ chọn
 * - bấm ô nằm trong khung đang chọn -> thu về riêng ô đó
 * - bấm ô khác cùng ngày mà mọi ô ở giữa đều đã được nhóm chọn -> kéo dài khung tới ô đó
 * @param {{ date: string, start: number, end: number }|null} selection
 * @param {{ date: string, start: number, end: number }} cell
 * @param {Set<string>} cellKeys - tập khoá `${date}|${start}` của các ô được chọn
 */
export function nextSelection(selection, cell, cellKeys) {
  const only = { date: cell.date, start: cell.start, end: cell.end };
  if (!selection || selection.date !== cell.date) return only;
  if (cell.start >= selection.start && cell.end <= selection.end) {
    return selection.start === cell.start && selection.end === cell.end ? null : only;
  }
  const start = Math.min(selection.start, cell.start);
  const end = Math.max(selection.end, cell.end);
  for (let m = start; m < end; m += CELL) {
    if (!cellKeys.has(`${cell.date}|${m}`)) return only;
  }
  return { date: cell.date, start, end };
}
