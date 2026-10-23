// BE/src/utils/schedule.js
// Hàm thuần xử lý lưới lịch rảnh: lưới nền 30 phút, hiển thị theo khối 1 giờ.

const CELL = 30;
const WEEKDAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

export function formatMinutes(total) {
  const h = Math.floor(total / 60);
  const m = String(total % 60).padStart(2, "0");
  return `${h}:${m}`;
}

export function formatRange(start, end) {
  return `${formatMinutes(start)} - ${formatMinutes(end)}`;
}

/** "2026-09-08" -> "Thứ Ba 8/9" */
export function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday} ${d}/${m}`;
}

/**
 * Tách các slot (có thể kéo dài nhiều ô) thành map ô 30 phút:
 * `${date}|${cellStart}` -> Map(userId -> tên)
 */
export function buildCellMap(rows) {
  const cells = new Map();
  for (const row of rows) {
    const start = Math.floor(row.start_minutes / CELL) * CELL;
    for (let m = start; m < row.end_minutes; m += CELL) {
      const key = `${row.date}|${m}`;
      if (!cells.has(key)) cells.set(key, new Map());
      cells.get(key).set(row.user_id, row.member_name || "Thành viên");
    }
  }
  return cells;
}

/** Mọi ô 30 phút trong [start, end) đều có ít nhất 1 người chọn. */
export function isWindowSelected(rows, date, start, end) {
  if (!Number.isInteger(start) || !Number.isInteger(end)) return false;
  if (start % CELL !== 0 || end % CELL !== 0 || start < 0 || end > 1440 || end <= start) return false;
  const cells = buildCellMap(rows);
  for (let m = start; m < end; m += CELL) {
    if (!cells.has(`${date}|${m}`)) return false;
  }
  return true;
}

/**
 * Dựng bảng theo khối 1 giờ chỉ gồm các ngày/giờ có người chọn.
 * Mỗi mục trong ô: { name, note } — note null nếu rảnh cả giờ, hoặc "8:00 - 8:30" nếu chỉ rảnh 30 phút.
 */
export function buildHourGrid(rows) {
  const cells = buildCellMap(rows);
  const dates = new Set();
  const hours = new Set();
  const byBlock = new Map(); // `${date}|${hour}` -> Map(userId -> { name, halves: Set })

  for (const [key, users] of cells) {
    const [date, minuteText] = key.split("|");
    const minute = Number(minuteText);
    const hour = Math.floor(minute / 60) * 60;
    dates.add(date);
    hours.add(hour);
    const blockKey = `${date}|${hour}`;
    if (!byBlock.has(blockKey)) byBlock.set(blockKey, new Map());
    const block = byBlock.get(blockKey);
    for (const [userId, name] of users) {
      if (!block.has(userId)) block.set(userId, { name, halves: new Set() });
      block.get(userId).halves.add(minute);
    }
  }

  const entries = {};
  for (const [blockKey, block] of byBlock) {
    entries[blockKey] = Array.from(block.values())
      .sort((a, b) => a.name.localeCompare(b.name, "vi"))
      .map(({ name, halves }) => ({
        name,
        note: halves.size >= 2 ? null : formatRange([...halves][0], [...halves][0] + CELL),
      }));
  }

  return {
    dates: [...dates].sort(),
    hours: [...hours].sort((a, b) => a - b),
    entries,
  };
}
