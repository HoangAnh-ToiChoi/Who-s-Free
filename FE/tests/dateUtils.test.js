import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateWeekDates, formatWeekRangeLabel } from "../src/utils/dateUtils.js";

const monday = new Date(2026, 10, 2); // 2/11/2026

test("tiếng Việt: thứ dạng T2…CN, ngày dạng 3/11 (ngắn, không xuống dòng trên mobile)", () => {
  const days = calculateWeekDates(monday, "vi");
  assert.deepEqual(days.map((d) => d.dayName), ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]);
  assert.equal(days[1].dateNum, "3/11");
  assert.equal(days[1].dateStr, "2026-11-03");
});

test("tiếng Anh giữ nguyên định dạng cũ", () => {
  const days = calculateWeekDates(monday, "en");
  assert.equal(days[1].dayName, "TUE");
  assert.equal(days[1].dateNum, "Nov 3");
  assert.equal(formatWeekRangeLabel(monday, "en"), "Nov 2 – 8, 2026");
});

test("nhãn tuần tiếng Việt, cùng tháng và vắt sang tháng sau", () => {
  assert.equal(formatWeekRangeLabel(monday, "vi"), "2 – 8/11/2026");
  assert.equal(formatWeekRangeLabel(new Date(2026, 10, 30), "vi-VN"), "30/11 – 6/12/2026");
});
