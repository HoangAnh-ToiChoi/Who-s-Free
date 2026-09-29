import { useState, useCallback, useEffect, useRef } from "react";
import { yOffsetToMinutes, calculateSlotGeometry } from "../helper/timeUtils";

/**
 * Hook quản lý riêng biệt cơ chế Kéo Thả (Drag to Select) thời gian thực trên lưới
 * Đảm bảo:
 * - Kéo 2 chiều (kéo từ trên xuống dưới hoặc kéo ngược từ dưới lên)
 * - Tọa độ phản hồi tức thì theo con trỏ chuột (Real-time tracking 60fps)
 * - Tự động snap theo bước nhảy 30 phút
 */
export function useGridDrag({ onDragComplete, containerRef, columnRefs }) {
  const [dragState, setDragState] = useState(null);
  // { dayIndex, originMinutes, currentMinutes, isDragging }

  const rafRef = useRef(null);

  // Bắt đầu kéo khi bấm chuột xuống
  const startDrag = useCallback((dayIndex, e) => {
    if (e.button !== 0) return; // Chỉ nhận chuột trái
    const colEl = columnRefs.current[dayIndex];
    if (!colEl) return;

    const rect = colEl.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const originMinutes = yOffsetToMinutes(offsetY);

    setDragState({
      dayIndex,
      originMinutes,
      currentMinutes: originMinutes + 30,
      isDragging: true,
    });
  }, [columnRefs]);

  // Rê chuột toàn cục (Global mousemove listener)
  useEffect(() => {
    if (!dragState?.isDragging) return;

    const handleMouseMove = (e) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        const colEl = columnRefs.current[dragState.dayIndex];
        if (!colEl) return;

        const rect = colEl.getBoundingClientRect();
        const offsetY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
        const hoveredMinutes = yOffsetToMinutes(offsetY);

        setDragState((prev) => {
          if (!prev) return null;
          // Cho phép kéo lên hoặc kéo xuống
          const nextMinutes =
            hoveredMinutes >= prev.originMinutes
              ? hoveredMinutes + 30
              : hoveredMinutes;
          return { ...prev, currentMinutes: nextMinutes };
        });
      });
    };

    const handleMouseUp = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      const colEl = columnRefs.current[dragState.dayIndex];
      const containerEl = containerRef.current;

      if (!colEl || !containerEl) {
        setDragState(null);
        return;
      }

      const rawStart = dragState.originMinutes;
      const rawEnd = dragState.currentMinutes;
      const start = Math.min(rawStart, rawEnd);
      const end = Math.max(rawStart, rawEnd);
      const finalEnd = end === start ? start + 30 : end;

      const { top, height } = calculateSlotGeometry(start, finalEnd);
      const colRect = colEl.getBoundingClientRect();

      // Vùng anchor để neo popover
      const anchorRect = {
        top: colRect.top + top,
        left: colRect.left,
        right: colRect.right,
        bottom: colRect.top + top + height,
        width: colRect.width,
        height,
      };

      onDragComplete?.({
        dayIndex: dragState.dayIndex,
        startMinutes: start,
        endMinutes: finalEnd,
        anchorRect,
        containerRect: containerEl.getBoundingClientRect(),
      });

      setDragState(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, columnRefs, containerRef, onDragComplete]);

  // Vùng xem trước đang kéo (Computed preview block)
  const dragPreview = dragState?.isDragging
    ? {
        dayIndex: dragState.dayIndex,
        startMinutes: Math.min(dragState.originMinutes, dragState.currentMinutes),
        endMinutes: Math.max(dragState.originMinutes, dragState.currentMinutes),
      }
    : null;

  return {
    isDragging: !!dragState?.isDragging,
    dragPreview,
    startDrag,
  };
}

export default useGridDrag;
