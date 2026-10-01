import { useTranslation } from "react-i18next";
import { cn } from "~/lib/utils";
import {
  calculateSlotGeometry,
  minutesToTimeString,
  formatDuration,
} from "~/utils/timeUtils";

/**
 * Thẻ hiển thị một khối thời gian rảnh đã chọn trên lưới ngày (Slot Card)
 * - Tiêu đề chính là note người dùng nhập (nếu không có note thì mặc định là "Available")
 * - Bảng màu tím Indigo thương hiệu Who's Free.
 */
function SlotCard({ slot, isActive, onClick, onResizeStart }) {
  const { t } = useTranslation();
  const { top, height } = calculateSlotGeometry(slot.startMinutes, slot.endMinutes);
  const timeRangeText = `${minutesToTimeString(slot.startMinutes)} – ${minutesToTimeString(slot.endMinutes)}`;
  const durationText = formatDuration(slot.startMinutes, slot.endMinutes);

  // Note chính là tiêu đề hiển thị của slot card, nếu không có note thì lấy t("matrix.available")
  const title =
    slot.note?.trim() ||
    (slot.label && slot.label !== "Available" ? slot.label : null) ||
    t("matrix.available");

  return (
    <div
      onClick={onClick}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        top: `${top}px`,
        height: `${height}px`,
      }}
      className={cn(
        "group absolute left-1 right-1 rounded-xl p-2.5 transition-all cursor-pointer select-none flex flex-col justify-between overflow-hidden",
        "bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/90 text-indigo-950 shadow-2xs hover:shadow-md",
        isActive && "ring-2 ring-indigo-600 shadow-md bg-indigo-100"
      )}
    >
      {/* Top Resize Handle Bar */}
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          onResizeStart?.(slot.id, "top", e);
        }}
        className="w-8 h-1 rounded-full bg-indigo-400/50 hover:bg-indigo-600 mx-auto -mt-1 cursor-ns-resize shrink-0 transition-colors"
      />

      {/* Main Content */}
      <div className="flex-1 my-0.5 overflow-hidden flex flex-col justify-between">
        {height < 45 ? (
          /* Compact view for 30m slots */
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="h-2 w-2 rounded-full bg-indigo-600 shrink-0" />
              <span
                className="text-xs font-bold text-indigo-950 truncate"
                title={title}
              >
                {title}
              </span>
            </div>
            <span className="text-[10px] font-bold text-indigo-800 shrink-0">
              {durationText}
            </span>
          </div>
        ) : (
          /* Standard view for >= 45m slots: Title has full width, no truncation cutoff */
          <>
            <div>
              <div className="flex items-start gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-600 shrink-0 mt-1" />
                <h4
                  className="text-xs font-bold text-indigo-950 leading-snug line-clamp-2 break-words flex-1 min-w-0"
                  title={title}
                >
                  {title}
                </h4>
              </div>
            </div>

            {/* Time range text and duration badge */}
            <div className="mt-1 flex items-center justify-between gap-1 pt-0.5">
              <p className="text-xs font-semibold text-slate-800">
                {timeRangeText}
              </p>
              <span className="rounded-md bg-white/95 border border-indigo-200/90 px-1.5 py-0.2 text-[10px] font-bold text-indigo-800 shrink-0 shadow-3xs">
                {durationText}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Bottom Resize Handle Bar */}
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          onResizeStart?.(slot.id, "bottom", e);
        }}
        className="w-8 h-1 rounded-full bg-indigo-400/50 hover:bg-indigo-600 mx-auto -mb-1 cursor-ns-resize shrink-0 transition-colors"
      />
    </div>
  );
}

export default SlotCard;
