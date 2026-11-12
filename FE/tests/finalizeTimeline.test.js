import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSelectedCells } from "../src/utils/finalizeCandidates.js";
import {
  buildTimelineDays,
  heatLevel,
  minutesAtX,
  presentMemberIds,
  rangeWithinRun,
  segmentAt,
  shortDateLabel,
  timelineRange,
} from "../src/utils/finalizeTimeline.js";

const slot = (dateStr, startMinutes, endMinutes) => ({ dateStr, startMinutes, endMinutes });
const members = [
  { memberId: "a", memberName: "An", slots: [slot("2026-11-12", 840, 1140)] },
  { memberId: "b", memberName: "Bình", slots: [slot("2026-11-12", 900, 1020), slot("2026-11-13", 540, 600)] },
  { memberId: "c", memberName: "Chi", slots: [] },
];
const cells = buildSelectedCells(members);
const keys = new Set(cells.map((c) => `${c.date}|${c.start}`));

test("buildTimelineDays: khoảng 14:00–19:00 là các đoạn liền theo số người, mỗi ngày đủ hàng thành viên đã nhập lịch", () => {
  const days = buildTimelineDays(cells, members);
  assert.deepEqual(days.map((d) => d.date), ["2026-11-12", "2026-11-13"]);
  assert.deepEqual(days[0].segments, [
    { start: 840, end: 900, count: 1 },
    { start: 900, end: 1020, count: 2 },
    { start: 1020, end: 1140, count: 1 },
  ]);
  assert.deepEqual(days[0].rows.map((r) => [r.name, r.intervals]), [["An", [[840, 1140]]], ["Bình", [[900, 1020]]]]);
  assert.deepEqual(days[1].rows.map((r) => r.intervals), [[], [[540, 600]]]);
});

test("timelineRange: khung rảnh làm tròn giờ chẵn, hoặc cả ngày", () => {
  const days = buildTimelineDays(cells, members);
  assert.deepEqual(timelineRange(days), { start: 540, end: 1140 });
  assert.deepEqual(timelineRange(days, "full"), { start: 0, end: 1440 });
  assert.deepEqual(timelineRange([]), { start: 0, end: 1440 });
});

test("minutesAtX: làm tròn 30 phút và kẹp trong trục", () => {
  const range = { start: 540, end: 1140 };
  assert.equal(minutesAtX(0, 60, range), 540);
  assert.equal(minutesAtX(95, 60, range), 630); // 9:00 + 95 phút = 10:35 → 10:30
  assert.equal(minutesAtX(-50, 60, range), 540);
  assert.equal(minutesAtX(10_000, 60, range), 1110);
});

test("rangeWithinRun: kéo hai chiều nhưng dừng ở ô trống; bắt đầu từ ô trống thì không chọn", () => {
  assert.deepEqual(rangeWithinRun(keys, "2026-11-12", 900, 990), { date: "2026-11-12", start: 900, end: 1020 });
  assert.deepEqual(rangeWithinRun(keys, "2026-11-12", 900, 600), { date: "2026-11-12", start: 840, end: 930 });
  assert.deepEqual(rangeWithinRun(keys, "2026-11-12", 1110, 1300), { date: "2026-11-12", start: 1110, end: 1140 });
  assert.equal(rangeWithinRun(keys, "2026-11-12", 600, 900), null);
});

test("segmentAt + presentMemberIds: chạm đoạn 2 người → cả An và Bình có mặt; khung lấn ra ngoài → chỉ An", () => {
  const day = buildTimelineDays(cells, members)[0];
  const seg = segmentAt(day, 930);
  assert.deepEqual(seg, { date: "2026-11-12", start: 900, end: 1020 });
  assert.deepEqual([...presentMemberIds(cells, seg)].sort(), ["a", "b"]);
  assert.deepEqual([...presentMemberIds(cells, { date: "2026-11-12", start: 840, end: 960 })], ["a"]);
  assert.equal(segmentAt(day, 600), null);
  assert.equal(presentMemberIds(cells, null).size, 0);
});

test("heatLevel + shortDateLabel", () => {
  assert.deepEqual([0, 1, 2, 3, 4].map((n) => heatLevel(n, 4)), [0, 0, 1, 2, 4]);
  assert.equal(heatLevel(4, 5), 3);
  assert.equal(shortDateLabel("2026-11-12"), "T5 12/11");
});
