import { useState, useCallback, useEffect, useRef } from "react";
import { yOffsetToMinutes, touchYOffsetToMinutes } from "~/utils/timeUtils";
import { isMinuteInAnySlot } from "~/utils/slotCollision";
import { computeDragUpdate, buildDragCompletion } from "./gridDragMath";

/**
 * Hook quản lý riêng biệt cơ chế Kéo Thả (Drag to Select) thời gian thực trên lưới
 * Đảm bảo:
 * - Kéo 2 chiều (kéo từ trên xuống dưới hoặc kéo ngược từ dưới lên)
 * - Kéo đa ngày (kéo ngang qua nhiều cột ngày để chọn cùng khung giờ)
 * - Tọa độ phản hồi tức thì theo con trỏ chuột (Real-time tracking 60fps)
 * - Tự động snap theo bước nhảy 30 phút
 * - Thuật toán chống va chạm (Collision Prevention): không cho phép kéo bên trong hoặc chồng lấn slot đã có
 */
export function useGridDrag({
  onDragComplete,
  containerRef,
  columnRefs,
  existingSlots = [],
}) {
  const [dragState, setDragState] = useState(null);
  // { originDayIndex, currentDayIndex, originMinutes, currentMinutes, cursorX, cursorY, isDragging }

  const rafRef = useRef(null);

  // Bắt đầu kéo khi bấm chuột xuống
  const startDrag = useCallback(
    (dayIndex, e) => {
      if (e.button !== 0) return; // Chỉ nhận chuột trái
      const colEl = columnRefs.current[dayIndex];
      if (!colEl) return;

      const rect = colEl.getBoundingClientRect();
      const offsetY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      const isTouch = e.pointerType === "touch";
      const originMinutes = (isTouch ? touchYOffsetToMinutes : yOffsetToMinutes)(offsetY);

      // Thuật toán: Nếu điểm bấm chuột nằm bên trong slot đã có -> Chặn không cho kéo tạo mới!
      if (isMinuteInAnySlot(dayIndex, originMinutes, existingSlots)) {
        return;
      }

      // Khóa bôi đen văn bản khi đang kéo
      document.body.style.userSelect = "none";
      document.body.style.cursor = "crosshair";

      setDragState({
        originDayIndex: dayIndex,
        currentDayIndex: dayIndex,
        originMinutes,
        currentMinutes: originMinutes + 30,
        cursorX: e.clientX,
        cursorY: e.clientY,
        isTouch,
        isDragging: true,
      });
    },
    [columnRefs, existingSlots]
  );

  // Rê chuột toàn cục (Global mousemove listener)
  useEffect(() => {
    if (!dragState?.isDragging) return;

    const handleMouseMove = (e) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        const next = computeDragUpdate(e, dragState, columnRefs.current || [], existingSlots);
        if (!next) return;
        const stepChanged =
          next.currentDayIndex !== dragState.currentDayIndex || next.currentMinutes !== dragState.currentMinutes;
        // Cảm ứng: không có nhãn bám ngón tay nên chỉ vẽ lại khi qua mốc 30 phút / sang ngày khác
        // (vẽ lại cả lưới mỗi px làm máy Android tầm trung bị khựng) + rung nhẹ báo đã qua mốc.
        if (dragState.isTouch) {
          if (!stepChanged) return;
          navigator.vibrate?.(8);
        }
        setDragState((prev) => (prev ? { ...prev, ...next, cursorX: e.clientX, cursorY: e.clientY } : null));
      });
    };

    const handleMouseUp = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      // Phục hồi style mặc định
      document.body.style.userSelect = "";
      document.body.style.cursor = "";

      if (!dragState) return;

      const result = buildDragCompletion(dragState, columnRefs.current || [], containerRef.current, existingSlots);
      if (result) onDragComplete?.(result);
      setDragState(null);
    };

    // Cảm ứng (sau khi nhấn giữ đã bắt đầu kéo): chặn cuộn trang/lưới trong lúc kéo; preventDefault ở touchend
    // để trình duyệt không phát thêm mousedown/mouseup "giả lập" gây tạo trùng một slot 30 phút.
    const handleTouchMove = (e) => {
      e.preventDefault();
      if (e.touches[0]) handleMouseMove(e.touches[0]);
    };
    const handleTouchEnd = (e) => {
      e.preventDefault();
      handleMouseUp();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: false });
    window.addEventListener("touchcancel", handleMouseUp);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleMouseUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragState, columnRefs, containerRef, onDragComplete]);

  // Vùng xem trước đang kéo (Computed preview block)
  const dragPreview = dragState?.isDragging
    ? {
        startDayIndex: Math.min(dragState.originDayIndex, dragState.currentDayIndex),
        endDayIndex: Math.max(dragState.originDayIndex, dragState.currentDayIndex),
        originDayIndex: dragState.originDayIndex,
        currentDayIndex: dragState.currentDayIndex,
        startMinutes: Math.min(dragState.originMinutes, dragState.currentMinutes),
        endMinutes: Math.max(dragState.originMinutes, dragState.currentMinutes),
        cursorX: dragState.cursorX,
        cursorY: dragState.cursorY,
        isTouch: dragState.isTouch,
      }
    : null;

  return {
    isDragging: !!dragState?.isDragging,
    dragPreview,
    startDrag,
  };
}

export default useGridDrag;
