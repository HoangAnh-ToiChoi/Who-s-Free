import { cn } from "~/lib/utils";

/**
 * MobileDayStrip - Dải 7 ngày phía trên lưới lịch, chỉ hiện trên mobile.
 * Tô đậm các ngày đang nằm trong khung nhìn của lưới, chạm một ngày để cuộn lưới tới đó.
 * `markedDates`: các dateStr có dữ liệu (slot rảnh) để hiện chấm nhỏ.
 */
function MobileDayStrip({ weekDays, firstVisible, visibleCount = 3, markedDates, onSelectDay }) {
  return (
    <div className="grid grid-cols-7 gap-1 md:hidden" role="group" aria-label="Chọn ngày">
      {weekDays.map((day, index) => {
        const inView = index >= firstVisible && index < firstVisible + visibleCount;
        const marked = markedDates?.has(day.dateStr);
        return (
          <button
            key={day.dateStr}
            type="button"
            aria-pressed={inView}
            onClick={() => onSelectDay(index)}
            className={cn(
              "flex h-14 flex-col items-center justify-center gap-0.5 rounded-xl border text-slate-700 transition-colors",
              inView
                ? "border-indigo-600 bg-indigo-600 text-white"
                : day.isToday
                  ? "border-indigo-500 bg-white text-indigo-700"
                  : "border-slate-200 bg-white"
            )}
          >
            <span className="text-[11px] font-semibold uppercase">{day.dayName}</span>
            <span className="text-base leading-none font-bold">{Number(day.dateStr.slice(8, 10))}</span>
            <span
              aria-hidden="true"
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                marked ? (inView ? "bg-white" : "bg-indigo-600") : "bg-transparent"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export default MobileDayStrip;
