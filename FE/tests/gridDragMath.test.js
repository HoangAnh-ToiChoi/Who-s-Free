import assert from "node:assert/strict";
import { test } from "node:test";
import { dayRange, findDayIndexAtX, computeDragUpdate, buildDragCompletion } from "../src/pages/MemberMatrix/hooks/gridDragMath.js";

// 3 cột ngày giả rộng 100px, cao 1536px (24h × 64px), bắt đầu y=0
const col = (left) => ({ getBoundingClientRect: () => ({ left, right: left + 100, top: 0, height: 1536, width: 100 }) });
const columns = [col(0), col(100), col(200)];
const container = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 1536 }) };

test("dayRange không phụ thuộc thứ tự", () => {
  assert.deepEqual(dayRange(2, 0), [0, 1, 2]);
  assert.deepEqual(dayRange(1, 1), [1]);
});

test("findDayIndexAtX: trong cột, ngoài mép trái/phải kẹp vào cột đầu/cuối", () => {
  assert.equal(findDayIndexAtX(columns, 150, 0), 1);
  assert.equal(findDayIndexAtX(columns, -20, 2), 0);
  assert.equal(findDayIndexAtX(columns, 999, 0), 2);
  assert.equal(findDayIndexAtX([], 50, 1), 1);
});

test("computeDragUpdate: kéo xuống từ 9:00 tới 10:15 ở cột 2 → tới 10:30, cột 1", () => {
  const drag = { originDayIndex: 0, originMinutes: 540 };
  const next = computeDragUpdate({ clientX: 150, clientY: 10.25 * 64 }, drag, columns, []);
  assert.deepEqual(next, { currentDayIndex: 1, currentMinutes: 630 });
});

test("buildDragCompletion: thả tay tạo khoảng nhiều ngày + vùng neo; chồng slot có sẵn → null", () => {
  const drag = { originDayIndex: 0, currentDayIndex: 1, originMinutes: 540, currentMinutes: 630 };
  const res = buildDragCompletion(drag, columns, container, []);
  assert.deepEqual(res.dayIndices, [0, 1]);
  assert.equal(res.startMinutes, 540);
  assert.equal(res.endMinutes, 630);
  assert.equal(res.anchorRect.left, 100);
  const blocked = buildDragCompletion(drag, columns, container, [{ dayIndex: 1, startMinutes: 600, endMinutes: 660 }]);
  assert.equal(blocked, null);
});

test("buildDragCompletion: chạm không kéo → khoảng 30 phút", () => {
  const drag = { originDayIndex: 2, currentDayIndex: 2, originMinutes: 600, currentMinutes: 600 };
  assert.equal(buildDragCompletion(drag, columns, container, []).endMinutes, 630);
});

import { touchYOffsetToMinutes, yOffsetToMinutes, HALF_HOUR_HEIGHT } from "../src/utils/timeUtils.js";

test("cảm ứng: chạm hơi lệch lên trên vạch 11:00 vẫn bắt đầu từ 11:00; chuột giữ nguyên cách tính cũ", () => {
  const line11 = 22 * HALF_HOUR_HEIGHT; // vạch 11:00 tính từ 00:00
  assert.equal(touchYOffsetToMinutes(line11 - 5), 660);
  assert.equal(yOffsetToMinutes(line11 - 5), 630);
  assert.equal(touchYOffsetToMinutes(line11 + HALF_HOUR_HEIGHT / 2), 660); // giữa ô 11:00–11:30
  assert.equal(touchYOffsetToMinutes(line11 - HALF_HOUR_HEIGHT / 2), 630); // giữa ô 10:30–11:00 vẫn là 10:30
});

import { indicatorPosition } from "../src/pages/MemberMatrix/hooks/gridDragMath.js";

test("nhãn kéo: bên phải con trỏ khi đủ chỗ, sát mép phải thì lật sang trái và không tràn màn hình", () => {
  assert.deepEqual(indicatorPosition(100, 300, 200, 1280), { x: 116, y: 250 });
  const nearRight = indicatorPosition(1200, 300, 420, 1280); // nhãn nhiều ngày dài 420px
  assert.equal(nearRight.x, 1200 - 16 - 420);
  assert.ok(nearRight.x + 420 <= 1280 - 8);
  assert.equal(indicatorPosition(20, 30, 600, 500).x, 8); // màn hẹp hơn nhãn: bám mép trái
  assert.equal(indicatorPosition(100, 30, 200, 1280).y, 12);
});
