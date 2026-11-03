// Nhấn giữ để bắt đầu kéo trên màn hình cảm ứng: ngón tay đứng yên đủ lâu → onHold (bắt đầu kéo chọn giờ);
// lỡ di chuyển quá `slop` px trước đó → coi là vuốt cuộn lưới, huỷ. Module thuần để test không cần DOM.
export const HOLD_DELAY_MS = 350;
export const HOLD_SLOP_PX = 10;

export function createTouchHold({
  delay = HOLD_DELAY_MS,
  slop = HOLD_SLOP_PX,
  onHold,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}) {
  let origin = null;
  let timer = null;

  const cancel = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
    origin = null;
  };

  return {
    start(point) {
      cancel();
      origin = { x: point.clientX, y: point.clientY };
      timer = setTimer(() => {
        const at = origin;
        timer = null;
        origin = null;
        if (at) onHold({ clientX: at.x, clientY: at.y });
      }, delay);
    },
    move(point) {
      if (!origin) return;
      if (Math.hypot(point.clientX - origin.x, point.clientY - origin.y) > slop) cancel();
    },
    end: cancel,
  };
}
