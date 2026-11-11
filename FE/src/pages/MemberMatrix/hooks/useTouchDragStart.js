import { useCallback, useEffect, useMemo, useRef } from "react";
import { createTouchHold } from "~/utils/touchHold";

/**
 * Trên màn hình cảm ứng: nhấn giữ một ô trống ~0,35s rồi mới bắt đầu kéo chọn giờ (gọi startDrag như chuột trái),
 * còn vuốt ngay thì vẫn là cuộn lưới. Rung nhẹ (nếu máy hỗ trợ) để báo đã vào chế độ kéo.
 */
export function useTouchDragStart(startDrag) {
  const holdRef = useRef(null);
  const startDragRef = useRef(startDrag);
  useEffect(() => {
    startDragRef.current = startDrag;
  });

  useEffect(() => () => holdRef.current?.end(), []);

  const onTouchStart = useCallback((dayIndex, e) => {
    const touch = e.touches[0];
    if (!touch || e.touches.length > 1) return;

    holdRef.current?.end();
    holdRef.current = createTouchHold({
      onHold: (point) => {
        navigator.vibrate?.(10);
        startDragRef.current(dayIndex, { button: 0, pointerType: "touch", ...point });
      },
    });
    holdRef.current.start(touch);
  }, []);

  const onTouchMove = useCallback((e) => {
    if (e.touches[0]) holdRef.current?.move(e.touches[0]);
  }, []);

  const onTouchEnd = useCallback(() => holdRef.current?.end(), []);

  // Giữ nguyên object giữa các lần render để DayColumn (memo) không vẽ lại vô ích
  return useMemo(() => ({ onTouchStart, onTouchMove, onTouchEnd }), [onTouchStart, onTouchMove, onTouchEnd]);
}
