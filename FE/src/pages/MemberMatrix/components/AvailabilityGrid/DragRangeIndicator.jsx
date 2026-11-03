import { Clock } from "lucide-react";
import { minutesToTimeString, formatDuration } from "~/utils/timeUtils";
import { cn } from "~/lib/utils";

// Cảm ứng: nhãn nằm giữa màn hình theo chiều ngang và cách điểm chạm đủ xa để ngón tay không che;
// gần mép trên thì chuyển xuống dưới ngón tay.
const TOUCH_GAP_PX = 110;

function indicatorPosition({ cursorX, cursorY, isTouch }) {
  if (!isTouch) {
    return {
      top: `${Math.max(12, cursorY - 50)}px`,
      left: `${Math.min(window.innerWidth - 240, cursorX + 16)}px`,
    };
  }
  const above = cursorY - TOUCH_GAP_PX;
  return {
    top: `${above >= 12 ? above : cursorY + TOUCH_GAP_PX - 40}px`,
    left: 0,
    right: 0,
    width: "fit-content",
    margin: "0 auto",
  };
}

/** Nhãn nổi khi đang kéo chọn khung giờ: bám con trỏ chuột, hoặc tránh ngón tay khi kéo bằng cảm ứng. */
function DragRangeIndicator({ dragPreview, weekDays }) {
  const dayName = (dayIndex) => weekDays.find((d) => d.dayIndex === dayIndex)?.dayName || "";
  const { startDayIndex, endDayIndex, startMinutes, endMinutes, isTouch } = dragPreview;

  return (
    <div
      style={indicatorPosition(dragPreview)}
      className={cn(
        "fixed z-50 pointer-events-none flex items-center gap-2 rounded-xl bg-slate-900/95 text-white shadow-2xl backdrop-blur-md border border-white/20 font-semibold select-none whitespace-nowrap animate-in fade-in-0 duration-75",
        isTouch ? "px-4 py-2.5 text-sm" : "px-3 py-1.5 text-xs"
      )}
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
