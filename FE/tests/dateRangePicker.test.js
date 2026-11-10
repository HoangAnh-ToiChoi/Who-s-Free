import assert from "node:assert/strict";
import { test } from "node:test";
import { buildMonthGrid, formatDateRangeLabel, parseISODate, pickRangeDate } from "../src/utils/dateUtils.js";

test("parseISODate không lệch ngày", () => {
  const d = parseISODate("2026-11-12");
  assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate()], [2026, 10, 12]);
});

test("buildMonthGrid tháng 11/2026 bắt đầu từ thứ Hai 26/10", () => {
  const grid = buildMonthGrid(2026, 10);
  assert.equal(grid.length, 42);
  assert.equal(grid[0].dateStr, "2026-10-26");
  assert.equal(grid[0].inMonth, false);
  assert.equal(grid.find((c) => c.inMonth).dateStr, "2026-11-01");
});

test("pickRangeDate: chọn bắt đầu → kết thúc → chọn lại", () => {
  let r = pickRangeDate(null, "2026-11-12");
  assert.deepEqual(r, { start: "2026-11-12", end: null });
  r = pickRangeDate(r, "2026-11-18");
  assert.deepEqual(r, { start: "2026-11-12", end: "2026-11-18" });
  assert.deepEqual(pickRangeDate(r, "2026-11-20"), { start: "2026-11-20", end: null });
  assert.deepEqual(pickRangeDate({ start: "2026-11-12", end: null }, "2026-11-10"), { start: "2026-11-10", end: null });
  assert.deepEqual(pickRangeDate({ start: "2026-11-12", end: null }, "2026-11-12"), { start: "2026-11-12", end: "2026-11-12" });
});

test("formatDateRangeLabel", () => {
  assert.equal(formatDateRangeLabel("2026-11-12", "2026-11-18", "vi"), "12/11 – 18/11/2026");
  assert.equal(formatDateRangeLabel("2026-12-28", "2027-01-03", "vi"), "28/12/2026 – 3/1/2027");
  assert.equal(formatDateRangeLabel("2026-11-12", "2026-11-12", "vi"), "12/11/2026");
  assert.equal(formatDateRangeLabel("2026-11-12", "2026-11-18", "en"), "Nov 12 – Nov 18, 2026");
});
