import assert from "node:assert/strict";
import { test } from "node:test";
import { initialDayIndex, isDateInWindow } from "../src/utils/dateUtils.js";
import { pickWindowDays } from "../src/pages/MemberMatrix/components/AvailabilityGrid/draftSlots.js";

// Tuần 9–15/11, phiên từ T3 10/11 → T5 12/11
const week = ["09", "10", "11", "12", "13", "14", "15"].map((d, i) => {
  const dateStr = `2026-11-${d}`;
  return { dayIndex: i, dateStr, isToday: false, inWindow: isDateInWindow(dateStr, "2026-11-10", "2026-11-12") };
});

test("isDateInWindow: biên, ngoài khoảng, phiên cũ không có ngày", () => {
  assert.equal(isDateInWindow("2026-11-10", "2026-11-10", "2026-11-12"), true);
  assert.equal(isDateInWindow("2026-11-12", "2026-11-10", "2026-11-12"), true);
  assert.equal(isDateInWindow("2026-11-09", "2026-11-10", "2026-11-12"), false);
  assert.equal(isDateInWindow("2026-11-13", "2026-11-10", "2026-11-12"), false);
  assert.equal(isDateInWindow("2026-11-13", null, null), true);
});

test("initialDayIndex: hôm nay trong khoảng → hôm nay; ngoài khoảng → ngày đầu của khoảng", () => {
  assert.equal(initialDayIndex(week.map((d, i) => ({ ...d, isToday: i === 2 }))), 2);
  assert.equal(initialDayIndex(week.map((d, i) => ({ ...d, isToday: i === 0 }))), 1);
  assert.equal(initialDayIndex(week.map((d) => ({ ...d, inWindow: undefined }))), 0);
});

test("pickWindowDays: kéo một ngày trong khoảng giữ nguyên", () =>
  assert.deepEqual(pickWindowDays(week, undefined, 1), { dayIndices: undefined, dayIndex: 1 }));

test("pickWindowDays: kéo T2→T6 chỉ còn T3–T5, cột kết thúc kẹp về T5", () =>
  assert.deepEqual(pickWindowDays(week, [0, 1, 2, 3, 4], 4), { dayIndices: [1, 2, 3], dayIndex: 3 }));

test("pickWindowDays: kéo T5→T6 còn đúng 1 ngày", () =>
  assert.deepEqual(pickWindowDays(week, [3, 4], 4), { dayIndices: undefined, dayIndex: 3 }));

test("pickWindowDays: toàn ngày ngoài khoảng → null", () => {
  assert.equal(pickWindowDays(week, [5, 6], 6), null);
  assert.equal(pickWindowDays(week, undefined, 0), null);
});
