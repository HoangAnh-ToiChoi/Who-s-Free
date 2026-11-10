import { cn } from "~/lib/utils";

/**
 * HeatmapHeader - Hàng 7 ngày phía trên lưới Heatmap, sticky top trong khung cuộn.
 * Ô góc sticky cả 2 chiều để che lên cột giờ khi vuốt ngang trên mobile.
 */
function HeatmapHeader({ weekDays }) {
  return (
    <div className="sticky top-0 z-40 grid grid-cols-[48px_repeat(7,minmax(0,1fr))] border-b border-slate-200/90 bg-slate-50 md:grid-cols-[60px_repeat(7,minmax(0,1fr))]">
      <div className="sticky left-0 z-50 h-10 border-r border-slate-200/60 bg-slate-50" />

      {/* 7 cột ngày */}
      {weekDays.map((day) => (
        <div
          key={day.dateStr}
          className={cn(
            "snap-start h-10 flex flex-col items-center justify-center text-center border-r border-slate-100/80 last:border-r-0",
            day.isToday && "bg-indigo-50/60",
            day.inWindow === false && "opacity-40"
          )}
        >
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-wider",
              day.isToday ? "text-indigo-600" : "text-slate-400"
            )}
          >
            {day.dayName}
          </span>
          <span
            className={cn(
              "text-xs font-semibold",
              day.isToday ? "text-indigo-700" : "text-slate-700"
            )}
          >
            {day.dateNum}
          </span>
        </div>
      ))}
    </div>
  );
}

export default HeatmapHeader;
