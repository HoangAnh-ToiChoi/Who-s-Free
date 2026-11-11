import { useLayoutEffect, useRef } from "react";
import BodyPortal from "~/components/BodyPortal";
import { indicatorPosition } from "../../hooks/gridDragMath";
import { Clock } from "lucide-react";
import { minutesToTimeString, formatDuration } from "~/utils/timeUtils";

/** Nội dung "T3 10/11: 09:00 – 11:00 · 2h" — dùng chung cho nhãn nổi (chuột) và chip trên thanh công cụ (cảm ứng). */
export function DragRangeLabel({ dragPreview, weekDays }) {
  const dayLabel = (dayIndex) => {
    const day = weekDays.find((d) => d.dayIndex === dayIndex);
    return day ? `${day.dayName} ${day.dateNum}` : "";
  };
  const { startDayIndex, endDayIndex, startMinutes, endMinutes } = dragPreview;
  return (
    <>
      <Clock size={13} className="text-indigo-400 shrink-0" />
      <span className="text-indigo-200">
        {startDayIndex === endDayIndex ? dayLabel(startDayIndex) : `${dayLabel(startDayIndex)} – ${dayLabel(endDayIndex)}`}
      </span>
      <span className="text-white font-bold">
        {minutesToTimeString(startMinutes)} – {minutesToTimeString(endMinutes)}
      </span>
      <span className="text-[10px] text-slate-300 font-medium bg-white/10 px-1.5 py-0.5 rounded-md">
        {formatDuration(startMinutes, endMinutes)}
      </span>
    </>
  );
}

/**
 * Nhãn nổi bám con trỏ khi kéo bằng chuột. Kéo bằng cảm ứng không dùng nhãn này (nó sẽ đè lên vùng đang kéo);
 * thông tin được hiện ở chip phía trên lưới (TouchDragHint).
 * Vị trí cập nhật thẳng vào DOM theo mousemove (rAF), không qua state → không vẽ lại lưới mỗi px.
 */
function DragRangeIndicator({ dragPreview, weekDays }) {
  const ref = useRef(null);
  const cursorRef = useRef({ x: dragPreview.cursorX, y: dragPreview.cursorY });

  useLayoutEffect(() => {
    let frame = null;
    const place = () => {
      frame = null;
      const el = ref.current;
      if (!el) return;
      const { x, y } = indicatorPosition(cursorRef.current.x, cursorRef.current.y, el.offsetWidth, window.innerWidth);
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    const onMove = (e) => {
      cursorRef.current = { x: e.clientX, y: e.clientY };
      if (frame === null) frame = requestAnimationFrame(place);
    };
    place();
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  // Chữ đổi (qua mốc 30 phút) có thể đổi bề rộng → đặt lại vị trí để không tràn mép
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { x, y } = indicatorPosition(cursorRef.current.x, cursorRef.current.y, el.offsetWidth, window.innerWidth);
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  });

  return (
    <BodyPortal>
      <div
        ref={ref}
        className="fixed top-0 left-0 z-50 pointer-events-none flex items-center gap-2 rounded-xl bg-slate-900/95 text-white shadow-2xl border border-white/20 px-3 py-1.5 text-xs font-semibold tabular-nums select-none whitespace-nowrap will-change-transform"
      >
        <DragRangeLabel dragPreview={dragPreview} weekDays={weekDays} />
      </div>
    </BodyPortal>
  );
}

export default DragRangeIndicator;
