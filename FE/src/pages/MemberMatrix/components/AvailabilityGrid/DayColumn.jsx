import { forwardRef } from "react";
import { cn } from "~/lib/utils";
import SlotCard from "./SlotCard";
import {
  calculateSlotGeometry,
  formatDuration,
  minutesToTimeString,
} from "~/utils/timeUtils";

/**
 * DayColumn - Cột lưới hiển thị lịch của một ngày cụ thể
 * - Zebra row striping (chẵn/lẻ) loại bỏ hiện tượng lóa mắt nền trắng
 * - Interactive hover guide trên từng ô 30p
 * - Weekend tint nhẹ phân biệt ngày làm việc và cuối tuần
 * - Vạch chỉ giờ thực tế (Current Time Red Line) trên cột Today
 */
const DayColumn = forwardRef(function DayColumn(
  {
    day,
    hours,
    daySlots,
    dragPreview,
    activeSlotId,
    onMouseDown,
    onSlotClick,
    onResizeStart,
  },
  ref
) {
  const isDraggingOnThisDay =
    dragPreview &&
    day.dayIndex >= dragPreview.startDayIndex &&
    day.dayIndex <= dragPreview.endDayIndex;
  const isWeekend = day.dayIndex >= 5;

  let previewStyle = null;
  let previewText = "";
  let previewHeight = 0;

  if (isDraggingOnThisDay) {
    const { top, height } = calculateSlotGeometry(
      dragPreview.startMinutes,
      dragPreview.endMinutes
    );
    previewHeight = height;
    previewStyle = { top: `${top}px`, height: `${height}px` };
    previewText = `${minutesToTimeString(dragPreview.startMinutes)} – ${minutesToTimeString(dragPreview.endMinutes)} (${formatDuration(dragPreview.startMinutes, dragPreview.endMinutes)})`;
  }

  return (
    <div
      ref={ref}
      onMouseDown={onMouseDown}
      className={cn(
        "relative border-r border-slate-200/90 last:border-r-0 cursor-crosshair select-none transition-colors",
        isWeekend && "bg-slate-50/40",
        day.isToday && "bg-indigo-50/15"
      )}
    >
      {/* Các hàng giờ: Zebra striping, nét đứt 30p, nét liền 1h, hover guide */}
      {hours.map((hour) => {
        const isOdd = hour % 2 === 1;
        return (
          <div
            key={hour}
            className={cn(
              "h-16 flex flex-col",
              isOdd && (isWeekend ? "bg-slate-100/40" : "bg-slate-50/50")
            )}
          >
            {/* Nửa giờ đầu (30p): Nét đứt rõ ràng + hover highlight */}
            <div className="h-8 border-b border-dashed border-slate-300 transition-colors duration-150 hover:bg-indigo-100/40" />
            {/* Nửa giờ sau (30p): Nét liền 1 giờ + hover highlight */}
            <div className="h-8 border-b border-slate-200/90 transition-colors duration-150 hover:bg-indigo-100/40" />
          </div>
        );
      })}

      {/* Khoảng dư sau 23h đồng bộ với TimeColumn */}
      <div className={cn("h-14", isWeekend ? "bg-slate-100/40" : "bg-slate-50/50")} />

      {/* Vùng xem trước khi đang kéo chuột (Real-time Drag Selection Box) */}
      {isDraggingOnThisDay && previewStyle && (
        <div
          style={previewStyle}
          className="absolute left-1 right-1 z-30 rounded-xl border-2 border-solid border-indigo-600 bg-indigo-500/30 px-2 py-1 pointer-events-none shadow-lg flex flex-col justify-between overflow-hidden backdrop-blur-2xs transition-all duration-75"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-indigo-950 truncate leading-tight">
              {previewText}
            </span>
            {previewHeight >= 48 && (
              <span className="shrink-0 rounded-md bg-indigo-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-3xs">
                Selecting
              </span>
            )}
          </div>
          {previewHeight >= 72 && (
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-indigo-800">
              <span className="rounded bg-indigo-100/90 px-1 py-0.5">
                {minutesToTimeString(dragPreview.startMinutes)}
              </span>
              <span>→</span>
              <span className="rounded bg-indigo-100/90 px-1 py-0.5">
                {minutesToTimeString(dragPreview.endMinutes)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Danh sách các Slot Card đã tạo */}
      {daySlots.map((slot) => (
        <SlotCard
          key={slot.id}
          slot={slot}
          isActive={activeSlotId === slot.id}
          onClick={(e) => onSlotClick(slot, e)}
          onResizeStart={onResizeStart}
        />
      ))}
    </div>
  );
});

export default DayColumn;
