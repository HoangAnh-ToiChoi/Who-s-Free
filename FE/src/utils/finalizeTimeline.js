import { hasResponded } from "./members.js";
import { formatMinutes } from "./finalizeCandidates.js";

// Tính toán cho timeline chọn giờ trong modal Chốt lịch (kiểu Timeline của Jira). Module thuần để test.

export const STEP = 30;
const SHORT_WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** "2026-11-12" -> "T5 12/11" (nhãn ngắn cho điện thoại) */
export function shortDateLabel(dateStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  return `${SHORT_WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d}/${m}`;
}

/** "9:00–12:00" */
export const formatSpan = (start, end) => `${formatMinutes(start)}–${formatMinutes(end)}`;

/** Gộp các khoảng [start, end) chồng hoặc nối nhau. */
function mergeIntervals(list) {
  const sorted = [...list].sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

/**
 * Dữ liệu từng ngày cho timeline.
 * - segments: các đoạn liền nhau cùng SỐ người rảnh (thanh tổng của ngày, đậm nhạt theo số người)
 * - rows: chỉ những thành viên có chọn giờ trong ngày đó, kèm các khoảng rảnh của họ (người vắng ghi ở dòng tóm tắt)
 * @param {Array<{ date, start, end, count }>} cells - từ buildSelectedCells, đã sắp theo ngày/giờ
 * @param {Array<{ memberId, memberName, avatarUrl, slots }>} members
 */
export function buildTimelineDays(cells, members) {
  const responded = members.filter(hasResponded);
  const byDate = new Map();
  for (const cell of cells) {
    if (!byDate.has(cell.date)) byDate.set(cell.date, []);
    const segs = byDate.get(cell.date);
    const last = segs[segs.length - 1];
    if (last && last.end === cell.start && last.count === cell.count) last.end = cell.end;
    else segs.push({ start: cell.start, end: cell.end, count: cell.count });
  }

  return [...byDate.entries()].map(([date, segments]) => ({
    date,
    segments,
    rows: responded
      .map((m) => ({
        memberId: m.memberId,
        name: m.memberName || "Thành viên",
        avatarUrl: m.avatarUrl,
        intervals: mergeIntervals(
          m.slots
            .filter((s) => String(s.dateStr || "").slice(0, 10) === date)
            .map((s) => [s.startMinutes, s.endMinutes])
        ),
      }))
      .filter((row) => row.intervals.length > 0),
  }));
}

/**
 * Khoảng giờ hiển thị trên trục: "free" = từ giờ chẵn trước khoảng rảnh sớm nhất tới giờ chẵn sau khoảng muộn nhất
 * của mọi ngày (để các ngày so được với nhau); "full" = cả ngày.
 */
export function timelineRange(days, mode = "free") {
  if (mode === "full" || days.length === 0) return { start: 0, end: 24 * 60 };
  let min = Infinity;
  let max = -Infinity;
  for (const day of days) {
    for (const seg of day.segments) {
      min = Math.min(min, seg.start);
      max = Math.max(max, seg.end);
    }
  }
  return { start: Math.floor(min / 60) * 60, end: Math.min(24 * 60, Math.ceil(max / 60) * 60) };
}

/** Phút (làm tròn xuống bước 30) tại toạ độ x trên trục, kẹp trong khoảng hiển thị. */
export function minutesAtX(x, pxPerHour, range) {
  const raw = range.start + (x / pxPerHour) * 60;
  const snapped = Math.floor(raw / STEP) * STEP;
  return Math.min(range.end - STEP, Math.max(range.start, snapped));
}

/**
 * Khung chọn khi kéo từ ô anchor tới ô target trong cùng ngày: chỉ kéo dài qua các ô nhóm đã chọn liên tiếp
 * (giống luật BE kiểm tra khi chốt), dừng ở ô trống đầu tiên. anchor không phải ô đã chọn → null.
 * @param {Set<string>} cellKeys - khoá `${date}|${start}` của các ô đã chọn
 */
export function rangeWithinRun(cellKeys, date, anchor, target) {
  const has = (m) => cellKeys.has(`${date}|${m}`);
  if (!has(anchor)) return null;
  let start = anchor;
  let end = anchor + STEP;
  if (target >= anchor) {
    while (end <= target && has(end)) end += STEP;
  } else {
    while (start > target && has(start - STEP)) start -= STEP;
  }
  return { date, start, end };
}

/** Đoạn liền nhau cùng số người chứa phút m (chạm vào thanh tổng để chọn nhanh cả đoạn). */
export function segmentAt(day, m) {
  const seg = day.segments.find((s) => m >= s.start && m < s.end);
  return seg ? { date: day.date, start: seg.start, end: seg.end } : null;
}

/** Thành viên rảnh TRỌN khung đang chọn (ô nào trong khung cũng có họ). */
export function presentMemberIds(cells, selection) {
  if (!selection) return new Set();
  const inside = cells.filter((c) => c.date === selection.date && c.start >= selection.start && c.end <= selection.end);
  if (inside.length * STEP !== selection.end - selection.start) return new Set();
  let present = new Set(inside[0]?.memberIds ?? []);
  for (const cell of inside.slice(1)) present = new Set(cell.memberIds.filter((id) => present.has(id)));
  return present;
}

/** Mức đậm nhạt (0–4) theo tỉ lệ người rảnh, cùng thang với heatmap. */
export function heatLevel(count, total) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  if (pct >= 100) return 4;
  if (pct > 75) return 3;
  if (pct > 50) return 2;
  if (pct > 25) return 1;
  return 0;
}
