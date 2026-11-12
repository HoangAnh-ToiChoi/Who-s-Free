import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildSelectedCells,
  formatDateLabel,
  formatRange,
} from "../src/utils/finalizeCandidates.js";

const members = [
  { memberId: "a", slots: [{ dateStr: "2026-09-08", startMinutes: 780, endMinutes: 840 }] },
  { memberId: "b", slots: [{ dateStr: "2026-09-08", startMinutes: 810, endMinutes: 870 }, { dateStr: "2026-09-09", startMinutes: 480, endMinutes: 510 }] },
];

test("tách thành ô 30 phút, đếm số người rảnh và sắp theo ngày, giờ", () => {
  assert.deepEqual(buildSelectedCells(members), [
    { date: "2026-09-08", start: 780, end: 810, count: 1, memberIds: ["a"] },
    { date: "2026-09-08", start: 810, end: 840, count: 2, memberIds: ["a", "b"] },
    { date: "2026-09-08", start: 840, end: 870, count: 1, memberIds: ["b"] },
    { date: "2026-09-09", start: 480, end: 510, count: 1, memberIds: ["b"] },
  ]);
  assert.deepEqual(buildSelectedCells([]), []);
});

test("định dạng ngày/giờ", () => {
  assert.equal(formatDateLabel("2026-09-08"), "Thứ Ba 8/9");
  assert.equal(formatRange(780, 840), "13:00 - 14:00");
});
