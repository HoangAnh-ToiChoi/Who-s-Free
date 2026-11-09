import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { popoverOverlaps } from "../src/pages/MemberMatrix/components/AvailabilityGrid/draftSlots.js";

const saved = [
  { id: "a", dayIndex: 0, dateStr: "2026-11-09", startMinutes: 480, endMinutes: 600 },
  { id: "b", dayIndex: 1, dateStr: "2026-11-10", startMinutes: 720, endMinutes: 780 },
  { id: "c", dayIndex: 0, dateStr: "2026-11-16", startMinutes: 900, endMinutes: 960 },
];
const check = (editingSlot, startMinutes, endMinutes, draftSlots = []) =>
  popoverOverlaps({ slots: saved, draftSlots, editingSlot, startMinutes, endMinutes });

describe("popoverOverlaps", () => {
  test("sửa slot kéo dài đè lên slot khác cùng ngày → trùng", () => {
    assert.equal(check({ id: "x", dateStr: "2026-11-09" }, 540, 660), true);
  });
  test("sửa chính nó (không đè slot khác) → không trùng", () => {
    assert.equal(check(saved[0], 450, 630), false);
  });
  test("sát mép (kết thúc đúng lúc slot kia bắt đầu) → không trùng", () => {
    assert.equal(check({ id: "x", dateStr: "2026-11-09" }, 600, 660), false);
  });
  test("cùng thứ nhưng khác tuần → không trùng", () => {
    assert.equal(check({ id: "x", dateStr: "2026-11-16" }, 480, 600), false);
  });
  test("slot mới kéo nhiều ngày: chỉ cần 1 ngày trùng là chặn", () => {
    const drafts = [
      { id: "d0", dateStr: "2026-11-09" },
      { id: "d1", dateStr: "2026-11-10" },
    ];
    assert.equal(check(drafts[0], 750, 810, drafts), true);
    assert.equal(check(drafts[0], 1200, 1260, drafts), false);
  });
  test("chưa mở popover → false", () => assert.equal(check(null, 0, 30), false));
});
