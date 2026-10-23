import assert from "node:assert/strict";
import { test } from "node:test";
import ExcelJS from "exceljs";
import { buildHourGrid, formatDateLabel, isWindowSelected } from "../../src/utils/schedule.js";
import { buildScheduleWorkbook, heatColor } from "../../src/services/schedule-export.service.js";

const rows = [
  { user_id: "u1", member_name: "An", date: "2026-09-08", start_minutes: 780, end_minutes: 840 },
  { user_id: "u2", member_name: "Bình", date: "2026-09-08", start_minutes: 780, end_minutes: 810 },
  { user_id: "u1", member_name: "An", date: "2026-09-09", start_minutes: 480, end_minutes: 540 },
];

test("formatDateLabel gắn thứ theo ngày", () => {
  assert.equal(formatDateLabel("2026-09-08"), "Thứ Ba 8/9");
});

test("buildHourGrid chỉ giữ ngày/giờ có người chọn và chú thích người rảnh 30 phút", () => {
  const grid = buildHourGrid(rows);
  assert.deepEqual(grid.dates, ["2026-09-08", "2026-09-09"]);
  assert.deepEqual(grid.hours, [480, 780]);
  assert.deepEqual(grid.entries["2026-09-08|780"], [
    { name: "An", note: null },
    { name: "Bình", note: "13:00 - 13:30" },
  ]);
});

test("isWindowSelected yêu cầu mọi ô 30 phút đều có người chọn", () => {
  assert.equal(isWindowSelected(rows, "2026-09-08", 780, 840), true);
  assert.equal(isWindowSelected(rows, "2026-09-08", 780, 870), false);
  assert.equal(isWindowSelected(rows, "2026-09-10", 780, 840), false);
  assert.equal(isWindowSelected(rows, "2026-09-08", 790, 840), false);
});

test("buildScheduleWorkbook xuất tiêu đề, ngày, giờ, tên và ghi chú", async () => {
  const buffer = await buildScheduleWorkbook({
    title: "Club Fair",
    rows,
    note: "Mang máy ảnh",
    finalized: { date: "2026-09-08", startMinutes: 780, endMinutes: 840 },
  });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const values = [];
  wb.worksheets[0].eachRow((row) => row.eachCell((c) => values.push(String(c.value))));
  for (const expected of ["CLUB FAIR", "Thứ Ba 8/9", "Thứ Tư 9/9", "13:00 - 14:00", "An\nBình (13:00 - 13:30)", "LƯU Ý: Mang máy ảnh"]) {
    assert.ok(values.includes(expected) || values.some((v) => v.includes(expected)), `thiếu: ${expected}`);
  }
  assert.equal(wb.worksheets[0].getCell("A2").value, "ĐÃ CHỐT: Thứ Ba 8/9, 13:00 - 14:00");
});

test("heatColor: nhiều người hơn thì đậm hơn, nhiều nhất là xanh lá", () => {
  assert.equal(heatColor(1, 1), "FFE0E7FF");
  assert.equal(heatColor(3, 3), "FFA7F3D0");
  assert.equal(heatColor(1, 4), "FFE0E7FF");
  assert.notEqual(heatColor(2, 4), heatColor(1, 4));
  assert.equal(heatColor(4, 4), "FFA7F3D0");
});

test("buildScheduleWorkbook tô nền ô theo số người rảnh và có chú giải màu", async () => {
  const buffer = await buildScheduleWorkbook({ title: "T", rows });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const sheet = wb.worksheets[0];
  const fillOf = (address) => sheet.getCell(address).fill?.fgColor?.argb;
  // Hàng 3: khối 8:00 (1 người); hàng 4: khối 13:00 (2 người) — ngày 8/9 ở cột B, ngày 9/9 ở cột C
  assert.equal(sheet.getCell("A4").value, "13:00 - 14:00");
  assert.equal(fillOf("B4"), "FFA7F3D0");
  assert.equal(fillOf("C3"), "FFE0E7FF");
  assert.equal(sheet.getCell("A5").value, "Số người rảnh");
});
