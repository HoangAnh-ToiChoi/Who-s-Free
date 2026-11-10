import BodyPortal from "~/components/BodyPortal";
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
 */
function DragRangeIndicator({ dragPreview, weekDays }) {
  const { cursorX, cursorY } = dragPreview;
  return (
    <BodyPortal>
      <div
        style={{ top: `${Math.max(12, cursorY - 50)}px`, left: `${Math.min(window.innerWidth - 240, cursorX + 16)}px` }}
        className="fixed z-50 pointer-events-none flex items-center gap-2 rounded-xl bg-slate-900/95 text-white shadow-2xl backdrop-blur-md border border-white/20 px-3 py-1.5 text-xs font-semibold select-none whitespace-nowrap animate-in fade-in-0 duration-75"
      >
        <DragRangeLabel dragPreview={dragPreview} weekDays={weekDays} />
      </div>
    </BodyPortal>
  );
}

export default DragRangeIndicator;
