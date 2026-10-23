import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildSelectedCells,
  formatDateLabel,
  formatRange,
  nextSelection,
} from "../src/utils/finalizeCandidates.js";

const members = [
  { memberId: "a", slots: [{ dateStr: "2026-09-08", startMinutes: 780, endMinutes: 840 }] },
  { memberId: "b", slots: [{ dateStr: "2026-09-08", startMinutes: 810, endMinutes: 870 }, { dateStr: "2026-09-09", startMinutes: 480, endMinutes: 510 }] },
];

test("tách thành ô 30 phút, đếm số người rảnh và sắp theo ngày, giờ", () => {
  assert.deepEqual(buildSelectedCells(members), [
    { date: "2026-09-08", start: 780, end: 810, count: 1 },
    { date: "2026-09-08", start: 810, end: 840, count: 2 },
    { date: "2026-09-08", start: 840, end: 870, count: 1 },
    { date: "2026-09-09", start: 480, end: 510, count: 1 },
  ]);
  assert.deepEqual(buildSelectedCells([]), []);
});

test("định dạng ngày/giờ", () => {
  assert.equal(formatDateLabel("2026-09-08"), "Thứ Ba 8/9");
  assert.equal(formatRange(780, 840), "13:00 - 14:00");
});

test("nextSelection: chọn, kéo dài, thu về, bỏ chọn và không vượt qua ô trống", () => {
  const cells = buildSelectedCells([
    { memberId: "a", slots: [{ dateStr: "2026-09-08", startMinutes: 780, endMinutes: 870 }, { dateStr: "2026-09-08", startMinutes: 960, endMinutes: 990 }] },
  ]);
  const keys = new Set(cells.map((c) => `${c.date}|${c.start}`));
  const cell = (start) => cells.find((c) => c.start === start);

  const first = nextSelection(null, cell(780), keys);
  assert.deepEqual(first, { date: "2026-09-08", start: 780, end: 810 });

  const extended = nextSelection(first, cell(840), keys);
  assert.deepEqual(extended, { date: "2026-09-08", start: 780, end: 870 });

  assert.deepEqual(nextSelection(extended, cell(810), keys), { date: "2026-09-08", start: 810, end: 840 });
  assert.equal(nextSelection(first, cell(780), keys), null);
  assert.deepEqual(nextSelection(first, cell(960), keys), { date: "2026-09-08", start: 960, end: 990 });
});
