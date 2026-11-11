import { yOffsetToMinutes, calculateSlotGeometry } from "../../../utils/timeUtils.js";
import { clampDragBoundary, hasSlotCollision } from "../../../utils/slotCollision.js";

// Phần tính toán của kéo-chọn-giờ, tách khỏi useGridDrag. `columns` là mảng phần tử cột ngày
// (chỉ cần getBoundingClientRect), nên test được với object giả, không cần DOM.

/** Các chỉ số ngày từ a tới b (bất kể thứ tự). */
export function dayRange(a, b) {
  const days = [];
  for (let d = Math.min(a, b); d <= Math.max(a, b); d++) days.push(d);
  return days;
}

/** Cột ngày dưới toạ độ x; ra ngoài mép trái/phải thì kẹp vào cột đầu/cuối; không khớp cột nào thì fallback. */
export function findDayIndexAtX(columns, x, fallback) {
  if (!columns || columns.length === 0) return fallback;
  const first = columns[0];
  const last = columns[columns.length - 1];
  if (first && x < first.getBoundingClientRect().left) return 0;
  if (last && x > last.getBoundingClientRect().right) return columns.length - 1;
  for (let i = 0; i < columns.length; i++) {
    const rect = columns[i]?.getBoundingClientRect();
    if (rect && x >= rect.left && x <= rect.right) return i;
  }
  return fallback;
}

/** Ngày + phút hiện tại khi con trỏ/ngón tay ở `point`, đã kẹp không chồng lên slot có sẵn. null nếu thiếu cột. */
export function computeDragUpdate(point, dragState, columns, existingSlots) {
  const currentDayIndex = findDayIndexAtX(columns, point.clientX, dragState.originDayIndex);
  const targetCol = columns[currentDayIndex] || columns[dragState.originDayIndex];
  if (!targetCol) return null;

  const rect = targetCol.getBoundingClientRect();
  const offsetY = Math.max(0, Math.min(rect.height, point.clientY - rect.top));
  const hoveredMinutes = yOffsetToMinutes(offsetY);
  // Kéo xuống: tính cả ô 30 phút đang trỏ; kéo lên: lấy mép trên của ô
  const rawNextMinutes = hoveredMinutes >= dragState.originMinutes ? hoveredMinutes + 30 : hoveredMinutes;
  const currentMinutes = clampDragBoundary(
    dragState.originMinutes,
    rawNextMinutes,
    dayRange(dragState.originDayIndex, currentDayIndex),
    existingSlots
  );
  return { currentDayIndex, currentMinutes };
}

/** Kết quả khi thả tay: khoảng ngày/giờ đã chọn + vùng neo popover. null nếu thiếu phần tử hoặc chồng slot có sẵn. */
export function buildDragCompletion(dragState, columns, containerEl, existingSlots) {
  const activeColEl = columns[dragState.currentDayIndex] || columns[dragState.originDayIndex];
  if (!activeColEl || !containerEl) return null;

  const start = Math.min(dragState.originMinutes, dragState.currentMinutes);
  const end = Math.max(dragState.originMinutes, dragState.currentMinutes);
  const finalEnd = end === start ? start + 30 : end;
  const dayIndices = dayRange(dragState.originDayIndex, dragState.currentDayIndex);
  if (hasSlotCollision(dayIndices, start, finalEnd, existingSlots)) return null;

  const { top, height } = calculateSlotGeometry(start, finalEnd);
  const colRect = activeColEl.getBoundingClientRect();
  return {
    startDayIndex: dayIndices[0],
    endDayIndex: dayIndices[dayIndices.length - 1],
    dayIndices,
    dayIndex: dragState.currentDayIndex,
    startMinutes: start,
    endMinutes: finalEnd,
    // Vùng neo popover tại cột kết thúc kéo
    anchorRect: {
      top: colRect.top + top,
      left: colRect.left,
      right: colRect.right,
      bottom: colRect.top + top + height,
      width: colRect.width,
      height,
    },
    containerRect: containerEl.getBoundingClientRect(),
  };
}

const GAP_PX = 16;
const EDGE_PX = 8;

/** Vị trí nhãn cạnh con trỏ: mặc định bên phải-phía trên; sát mép phải thì lật sang trái, không bao giờ ra ngoài màn hình. */
export function indicatorPosition(cursorX, cursorY, width, viewportWidth) {
  const fitsRight = cursorX + GAP_PX + width <= viewportWidth - EDGE_PX;
  const left = fitsRight ? cursorX + GAP_PX : cursorX - GAP_PX - width;
  return {
    x: Math.max(EDGE_PX, Math.min(left, viewportWidth - EDGE_PX - width)),
    y: Math.max(12, cursorY - 50),
  };
}
