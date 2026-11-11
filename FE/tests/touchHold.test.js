import assert from "node:assert/strict";
import { test } from "node:test";
import { createTouchHold } from "../src/utils/touchHold.js";

// Đồng hồ giả để điều khiển thời gian trong test
function fakeTimers() {
  let pending = null;
  return {
    setTimer: (fn) => { pending = fn; return 1; },
    clearTimer: () => { pending = null; },
    fire: () => pending?.(),
    hasPending: () => pending !== null,
  };
}

test("giữ yên đủ lâu → bắt đầu kéo tại vị trí ngón tay lúc đó (đã xê dịch nhẹ)", () => {
  const t = fakeTimers();
  const holds = [];
  const hold = createTouchHold({ onHold: (p) => holds.push(p), ...t });
  hold.start({ clientX: 100, clientY: 200 });
  hold.move({ clientX: 104, clientY: 203 }); // run tay nhẹ trong ngưỡng
  t.fire();
  assert.deepEqual(holds, [{ clientX: 104, clientY: 203 }]);
});

test("vuốt quá ngưỡng trước khi hết thời gian giữ → là cuộn, không kéo", () => {
  const t = fakeTimers();
  let held = false;
  const hold = createTouchHold({ onHold: () => { held = true; }, ...t });
  hold.start({ clientX: 100, clientY: 200 });
  hold.move({ clientX: 100, clientY: 240 });
  assert.equal(t.hasPending(), false);
  t.fire();
  assert.equal(held, false);
});

test("nhấc tay sớm (chạm nhanh) → không kéo", () => {
  const t = fakeTimers();
  let held = false;
  const hold = createTouchHold({ onHold: () => { held = true; }, ...t });
  hold.start({ clientX: 10, clientY: 10 });
  hold.end();
  t.fire();
  assert.equal(held, false);
});
