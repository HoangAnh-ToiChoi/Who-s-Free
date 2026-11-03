import { Clock } from "lucide-react";
import { minutesToTimeString, formatDuration } from "~/utils/timeUtils";

/** Nhãn nổi bám theo con trỏ khi đang kéo chọn khung giờ. */
function DragRangeIndicator({ dragPreview, weekDays }) {
  const dayName = (dayIndex) => weekDays.find((d) => d.dayIndex === dayIndex)?.dayName || "";
  const { startDayIndex, endDayIndex, startMinutes, endMinutes, cursorX, cursorY } = dragPreview;

  return (
    <div
      style={{
        top: `${Math.max(12, cursorY - 50)}px`,
        left: `${Math.min(window.innerWidth - 240, cursorX + 16)}px`,
      }}
      className="fixed z-50 pointer-events-none flex items-center gap-2 rounded-xl bg-slate-900/95 text-white px-3 py-1.5 shadow-2xl backdrop-blur-md border border-white/20 text-xs font-semibold select-none animate-in fade-in-0 duration-75"
    >
      <Clock size={13} className="text-indigo-400 shrink-0" />
      <span className="text-indigo-200">
        {startDayIndex === endDayIndex
          ? dayName(startDayIndex)
          : `${dayName(startDayIndex)} – ${dayName(endDayIndex)}`}
        :
      </span>
      <span className="text-white font-bold">
        {minutesToTimeString(startMinutes)} – {minutesToTimeString(endMinutes)}
      </span>
      <span className="text-[10px] text-slate-300 font-medium bg-white/10 px-1.5 py-0.5 rounded-md">
        {formatDuration(startMinutes, endMinutes)}
      </span>
    </div>
  );
}

export default DragRangeIndicator;
