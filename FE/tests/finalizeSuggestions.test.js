import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSelectedCells } from "../src/utils/finalizeCandidates.js";
import { mergeRuns, rankSuggestions } from "../src/utils/finalizeSuggestions.js";

const members = [
  { memberId: "a", slots: [{ dateStr: "2026-09-08", startMinutes: 780, endMinutes: 900 }] },
  { memberId: "b", slots: [{ dateStr: "2026-09-08", startMinutes: 810, endMinutes: 870 }, { dateStr: "2026-09-09", startMinutes: 480, endMinutes: 510 }] },
];

test("mergeRuns gộp ô liền nhau cùng nhóm người, tách khi đổi người hoặc đổi ngày", () => {
  const runs = mergeRuns(buildSelectedCells(members)).map(({ date, start, end, count }) => ({ date, start, end, count }));
  assert.deepEqual(runs, [
    { date: "2026-09-08", start: 780, end: 810, count: 1 },
    { date: "2026-09-08", start: 810, end: 870, count: 2 },
    { date: "2026-09-08", start: 870, end: 900, count: 1 },
    { date: "2026-09-09", start: 480, end: 510, count: 1 },
  ]);
  assert.deepEqual(mergeRuns([]), []);
});

test("rankSuggestions: tối ưu theo số người rồi độ dài; hạn chế không trùng khung tối ưu", () => {
  const { optimal, limited } = rankSuggestions(buildSelectedCells(members), 2);
  assert.deepEqual(optimal.map((r) => [r.date, r.start, r.count]), [
    ["2026-09-08", 810, 2],
    ["2026-09-08", 780, 1],
    ["2026-09-08", 870, 1],
  ]);
  assert.deepEqual(limited.map((r) => [r.date, r.start]), [["2026-09-09", 480]]);
  assert.deepEqual(rankSuggestions([], 0), { optimal: [], limited: [] });
});
