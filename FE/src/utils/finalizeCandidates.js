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
 * @returns {Array<{ date: string, start: number, end: number, count: number, memberIds: string[] }>} sắp theo ngày, giờ
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
    .map(({ people, ...cell }) => ({ ...cell, count: people.size, memberIds: [...people].sort() }))
    .sort((a, b) => (a.date === b.date ? a.start - b.start : a.date < b.date ? -1 : 1));
}
