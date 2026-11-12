import { useCallback, useRef } from "react";
import { STEP, minutesAtX, rangeWithinRun, segmentAt } from "~/utils/finalizeTimeline";

const TAP_SLOP_PX = 8;

const minutesFor = (e, el, pxPerHour, range) =>
  minutesAtX(e.clientX - el.getBoundingClientRect().left, pxPerHour, range);

function begin(dragRef, e, state) {
  dragRef.current = { ...state, startX: e.clientX, moved: false, pointerType: e.pointerType };
  // Cảm ứng trên thanh: không giữ con trỏ để trình duyệt vẫn cuộn ngang được
  if (state.mode === "handle" || e.pointerType === "mouse") e.currentTarget.setPointerCapture?.(e.pointerId);
}

/**
 * Chọn khung giờ trên thanh tổng của một ngày (chỉ bắt đầu trên một đoạn có người; chỗ trống để dành cho nắm kéo bảng):
 * - Chạm / bấm một đoạn → chọn cả đoạn (cùng số người).
 * - Chuột: nhấn trên một đoạn rồi kéo → chọn từ ô đó tới ô đang trỏ (chỉ qua các ô nhóm đã chọn liên tiếp).
 * - Hai tay nắm ở hai đầu khung đang chọn: kéo để chỉnh (chuột và cảm ứng). Vuốt trên thanh vẫn là cuộn ngang.
 * Bước 30 phút; luật kéo giống luật BE kiểm tra khi chốt (rangeWithinRun).
 */
export function useTimelineDrag({ day, cellKeys, axis, selection, onSelect }) {
  const { range, pxPerHour } = axis;
  const dragRef = useRef(null); // { anchor, startX, moved, mode: "bar" | "handle", pointerType }

  const onBarPointerDown = useCallback(
    (e) => {
      if (e.button > 0) return;
      const anchor = minutesFor(e, e.currentTarget, pxPerHour, range);
      if (!cellKeys.has(`${day.date}|${anchor}`)) return;
      begin(dragRef, e, { mode: "bar", anchor, el: e.currentTarget });
    },
    [cellKeys, day.date, pxPerHour, range]
  );

  const onHandlePointerDown = useCallback(
    (edge) => (e) => {
      if (!selection) return;
      e.stopPropagation();
      const anchor = edge === "start" ? selection.end - STEP : selection.start;
      begin(dragRef, e, { mode: "handle", anchor, el: e.currentTarget.parentElement });
    },
    [selection]
  );

  const onPointerMove = useCallback(
    (e) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (!drag.moved && Math.abs(e.clientX - drag.startX) < TAP_SLOP_PX) return;
      drag.moved = true;
      // Trên cảm ứng, kéo thanh = cuộn ngang; chỉ tay nắm mới kéo chọn
      if (drag.mode === "bar" && drag.pointerType !== "mouse") return;
      const next = rangeWithinRun(cellKeys, day.date, drag.anchor, minutesFor(e, drag.el, pxPerHour, range));
      if (next) onSelect(next);
    },
    [cellKeys, day.date, onSelect, pxPerHour, range]
  );

  const onPointerUp = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.mode === "bar" && !drag.moved) onSelect(segmentAt(day, drag.anchor));
  }, [day, onSelect]);

  // Trình duyệt giành lấy cử chỉ để cuộn (pointercancel): không coi là chạm chọn
  const onPointerCancel = useCallback(() => {
    dragRef.current = null;
  }, []);

  return {
    bar: { onPointerDown: onBarPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    handle: (edge) => ({
      onPointerDown: onHandlePointerDown(edge),
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    }),
  };
}

export default useTimelineDrag;
