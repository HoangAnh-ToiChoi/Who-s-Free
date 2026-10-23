import ExcelJS from "exceljs";
import { buildHourGrid, formatDateLabel, formatRange } from "../utils/schedule.js";

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Toàn bộ màu/kích thước của bảng nằm ở đây để đổi giao diện Excel chỉ cần sửa một chỗ. */
export const SCHEDULE_THEME = {
  border: "FF94A3B8",
  titleText: "FF0F172A",
  headerText: "FF0F172A",
  headerFill: "FFE0E7FF",
  hourText: "FF0F172A",
  hourFill: "FFF1F5F9",
  finalizedText: "FF14532D",
  finalizedFill: "FF4ADE80",
  bannerFill: "FFDCFCE7",
  bannerText: "FF166534",
  // Heatmap theo số người rảnh: nhạt (ít người) -> đậm (nhiều người), cao nhất là xanh lá
  heatLow: [224, 231, 255],
  heatHigh: [129, 140, 248],
  heatTop: "FFA7F3D0",
  noteText: "FFB91C1C",
  dateColumnWidth: 26,
  hourColumnWidth: 16,
};

const THIN = { style: "thin", color: { argb: SCHEDULE_THEME.border } };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const CENTER = { vertical: "middle", horizontal: "center", wrapText: true };

/**
 * Màu nền ô theo số người rảnh. Nhiều nhất (từ 2 người trở lên) = xanh lá, còn lại nội suy nhạt -> đậm.
 * @returns {string} ARGB
 */
export function heatColor(count, maxCount, theme = SCHEDULE_THEME) {
  if (maxCount >= 2 && count >= maxCount) return theme.heatTop;
  const t = maxCount <= 2 ? 0 : (count - 1) / (maxCount - 2);
  const [lr, lg, lb] = theme.heatLow;
  const [hr, hg, hb] = theme.heatHigh;
  const mix = (a, b) => Math.round(a + (b - a) * Math.min(1, Math.max(0, t)));
  return `FF${[mix(lr, hr), mix(lg, hg), mix(lb, hb)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

const solid = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

/** Ghi một ô: giá trị + (tuỳ chọn) font, màu nền, viền, căn giữa. */
function styleCell(cell, { value, font, fill, bordered = false }) {
  if (value !== undefined) cell.value = value;
  if (font) cell.font = font;
  if (fill) cell.fill = solid(fill);
  if (bordered) cell.border = BORDER;
  cell.alignment = CENTER;
  return cell;
}

/**
 * Tạo file Excel lịch theo khối 1 giờ: cột = ngày có người chọn, dòng = giờ có người chọn,
 * ô = tên các thành viên rảnh (rảnh 30 phút thì kèm chú thích khoảng đó).
 *
 * @param {{ title: string, rows: object[], note?: string|null, finalized?: { date: string, startMinutes: number, endMinutes: number }|null }} input
 * @returns {Promise<Buffer>}
 */
export async function buildScheduleWorkbook({ title, rows, note = null, finalized = null }) {
  const theme = SCHEDULE_THEME;
  const { dates, hours, entries } = buildHourGrid(rows);
  const maxCount = Math.max(1, ...Object.values(entries).map((people) => people.length));
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Lịch");
  const lastCol = Math.max(dates.length + 1, 2);

  sheet.getColumn(1).width = theme.hourColumnWidth;
  for (let c = 2; c <= lastCol; c += 1) sheet.getColumn(c).width = theme.dateColumnWidth;

  let rowIndex = 1;
  const addMergedRow = (text, { size = 12, color, fill, height = 24 }) => {
    sheet.mergeCells(rowIndex, 1, rowIndex, lastCol);
    styleCell(sheet.getCell(rowIndex, 1), { value: text, font: { bold: true, size, color: { argb: color } }, fill });
    sheet.getRow(rowIndex).height = height;
    rowIndex += 1;
  };

  addMergedRow(String(title || "Lịch").toUpperCase(), { size: 14, color: theme.titleText, height: 30 });
  if (finalized) {
    addMergedRow(
      `ĐÃ CHỐT: ${formatDateLabel(finalized.date)}, ${formatRange(finalized.startMinutes, finalized.endMinutes)}`,
      { color: theme.bannerText, fill: theme.bannerFill },
    );
  }

  const headerRow = rowIndex;
  sheet.getCell(headerRow, 1).border = BORDER;
  dates.forEach((date, index) => {
    styleCell(sheet.getCell(headerRow, index + 2), {
      value: formatDateLabel(date),
      font: { bold: true, color: { argb: theme.headerText } },
      fill: theme.headerFill,
      bordered: true,
    });
  });
  sheet.getRow(headerRow).height = 22;
  rowIndex += 1;

  for (const hour of hours) {
    styleCell(sheet.getCell(rowIndex, 1), {
      value: formatRange(hour, hour + 60),
      font: { bold: true, color: { argb: theme.hourText } },
      fill: theme.hourFill,
      bordered: true,
    });

    let maxLines = 1;
    dates.forEach((date, index) => {
      const people = entries[`${date}|${hour}`] || [];
      const lines = people.map((p) => (p.note ? `${p.name} (${p.note})` : p.name));
      const inFinalized =
        finalized &&
        finalized.date === date &&
        hour < finalized.endMinutes &&
        hour + 60 > finalized.startMinutes;

      styleCell(sheet.getCell(rowIndex, index + 2), {
        value: lines.join("\n"),
        font: inFinalized ? { bold: true, color: { argb: theme.finalizedText } } : undefined,
        fill: inFinalized ? theme.finalizedFill : people.length ? heatColor(people.length, maxCount) : undefined,
        bordered: true,
      });
      maxLines = Math.max(maxLines, lines.length);
    });
    sheet.getRow(rowIndex).height = Math.max(22, maxLines * 16);
    rowIndex += 1;
  }

  // Chú giải màu: số người rảnh từ 1 đến nhiều nhất
  if (maxCount >= 1) {
    const legendRow = rowIndex;
    styleCell(sheet.getCell(legendRow, 1), {
      value: "Số người rảnh",
      font: { bold: true, color: { argb: theme.hourText } },
      fill: theme.hourFill,
      bordered: true,
    });
    for (let n = 1; n <= Math.min(maxCount, lastCol - 1); n += 1) {
      styleCell(sheet.getCell(legendRow, n + 1), {
        value: n === maxCount && maxCount >= 2 ? `${n} người (nhiều nhất)` : `${n} người`,
        fill: heatColor(n, maxCount),
        bordered: true,
      });
    }
    rowIndex += 1;
  }

  if (note && String(note).trim()) {
    addMergedRow(`LƯU Ý: ${String(note).trim()}`, { color: theme.noteText, height: 28 });
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export default { buildScheduleWorkbook };
