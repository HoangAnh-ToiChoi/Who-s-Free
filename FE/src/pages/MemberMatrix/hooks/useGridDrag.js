import { useState, useCallback, useEffect, useRef } from "react";
import { yOffsetToMinutes, calculateSlotGeometry } from "~/utils/timeUtils";
import {
  isMinuteInAnySlot,
  clampDragBoundary,
  hasSlotCollision,
} from "~/utils/slotCollision";

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
      const originMinutes = yOffsetToMinutes(offsetY);

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
        // 1. Xác định cột ngày hiện tại mà chuột đang trỏ tới (Hỗ trợ kéo ngang qua nhiều ngày)
        let newCurrentDay = dragState.originDayIndex;
        if (columnRefs.current && columnRefs.current.length > 0) {
          const firstCol = columnRefs.current[0];
          const lastCol = columnRefs.current[columnRefs.current.length - 1];

          if (firstCol && e.clientX < firstCol.getBoundingClientRect().left) {
            newCurrentDay = 0;
          } else if (lastCol && e.clientX > lastCol.getBoundingClientRect().right) {
            newCurrentDay = columnRefs.current.length - 1;
          } else {
            for (let i = 0; i < columnRefs.current.length; i++) {
              const el = columnRefs.current[i];
              if (!el) continue;
              const cRect = el.getBoundingClientRect();
              if (e.clientX >= cRect.left && e.clientX <= cRect.right) {
                newCurrentDay = i;
                break;
              }
            }
          }
        }

        // 2. Tính số phút dựa trên trục Y của cột mục tiêu
        const targetCol =
          columnRefs.current[newCurrentDay] ||
          columnRefs.current[dragState.originDayIndex];
        if (!targetCol) return;

        const rect = targetCol.getBoundingClientRect();
        const offsetY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
        const hoveredMinutes = yOffsetToMinutes(offsetY);

        // 3. Cho phép kéo lên hoặc kéo xuống linh hoạt kèm clamp va chạm
        const rawNextMinutes =
          hoveredMinutes >= dragState.originMinutes
            ? hoveredMinutes + 30
            : hoveredMinutes;

        // Tính các ngày đang được chọn
        const minDay = Math.min(dragState.originDayIndex, newCurrentDay);
        const maxDay = Math.max(dragState.originDayIndex, newCurrentDay);
        const activeDays = [];
        for (let d = minDay; d <= maxDay; d++) activeDays.push(d);

        // Thuật toán: Clamp phạm vi kéo không cho vượt qua mép slot đã có
        const clampedMinutes = clampDragBoundary(
          dragState.originMinutes,
          rawNextMinutes,
          activeDays,
          existingSlots
        );

        setDragState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            currentDayIndex: newCurrentDay,
            currentMinutes: clampedMinutes,
            cursorX: e.clientX,
            cursorY: e.clientY,
          };
        });
      });
    };

    const handleMouseUp = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      // Phục hồi style mặc định
      document.body.style.userSelect = "";
      document.body.style.cursor = "";

      if (!dragState) return;

      const startDay = Math.min(dragState.originDayIndex, dragState.currentDayIndex);
      const endDay = Math.max(dragState.originDayIndex, dragState.currentDayIndex);

      const activeColEl =
        columnRefs.current[dragState.currentDayIndex] ||
        columnRefs.current[dragState.originDayIndex];
      const containerEl = containerRef.current;

      if (!activeColEl || !containerEl) {
        setDragState(null);
        return;
      }

      const rawStart = dragState.originMinutes;
      const rawEnd = dragState.currentMinutes;
      const start = Math.min(rawStart, rawEnd);
      const end = Math.max(rawStart, rawEnd);
      const finalEnd = end === start ? start + 30 : end;

      const dayIndices = [];
      for (let i = startDay; i <= endDay; i++) {
        dayIndices.push(i);
      }

      // Thuật toán: Kiểm tra lần cuối, nếu khoảng kéo giao thoa với slot đã có -> Hủy bỏ
      if (hasSlotCollision(dayIndices, start, finalEnd, existingSlots)) {
        setDragState(null);
        return;
      }

      const { top, height } = calculateSlotGeometry(start, finalEnd);
      const colRect = activeColEl.getBoundingClientRect();

      // Vùng anchor để neo popover tại cột kéo kết thúc
      const anchorRect = {
        top: colRect.top + top,
        left: colRect.left,
        right: colRect.right,
        bottom: colRect.top + top + height,
        width: colRect.width,
        height,
      };

      onDragComplete?.({
        startDayIndex: startDay,
        endDayIndex: endDay,
        dayIndices,
        dayIndex: dragState.currentDayIndex,
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
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
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
      }
    : null;

  return {
    isDragging: !!dragState?.isDragging,
    dragPreview,
    startDrag,
  };
}

export default useGridDrag;
