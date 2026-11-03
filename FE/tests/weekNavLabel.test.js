import assert from "node:assert/strict";
import { test } from "node:test";
import { getMondayOfWeek } from "../src/utils/dateUtils.js";

// Cùng công thức với useWeekNavigation: số tuần lệch so với tuần hiện tại
const offsetOf = (monday, now = new Date(2026, 10, 3)) =>
  Math.round((monday - getMondayOfWeek(now)) / (7 * 24 * 60 * 60 * 1000));

test("tuần hiện tại = 0, tuần sau = +1, lùi 5 tuần = -5", () => {
  const thisMonday = getMondayOfWeek(new Date(2026, 10, 3));
  const shift = (weeks) => { const d = new Date(thisMonday); d.setDate(d.getDate() + weeks * 7); return d; };
  assert.equal(offsetOf(thisMonday), 0);
  assert.equal(offsetOf(shift(1)), 1);
  assert.equal(offsetOf(shift(-5)), -5);
});

test("không lệch khi đổi giờ mùa hè (dùng Math.round)", () => {
  const thisMonday = getMondayOfWeek(new Date(2026, 2, 23));
  const next = new Date(thisMonday); next.setDate(next.getDate() + 7);
  assert.equal(offsetOf(next, new Date(2026, 2, 23)), 1);
});
