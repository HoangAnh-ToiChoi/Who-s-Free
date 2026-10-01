import { cn } from "~/lib/utils";

/**
 * HeatmapHeader - Header hiển thị 7 ngày trong tuần phía trên lưới Heatmap
 */
function HeatmapHeader({ weekDays, gutterWidth = 0 }) {
  return (
    <div
      className="grid shrink-0 border-b border-slate-200/90 bg-slate-50/80"
      style={{
        gridTemplateColumns: `60px repeat(7, 1fr)`,
        paddingRight: `${gutterWidth}px`,
      }}
    >
      {/* Ô góc trái trống (cùng chiều rộng cột giờ) */}
      <div className="h-10 border-r border-slate-200/60" />

      {/* 7 cột ngày */}
      {weekDays.map((day) => (
        <div
          key={day.dateStr}
          className={cn(
            "h-10 flex flex-col items-center justify-center text-center border-r border-slate-100/80 last:border-r-0",
            day.isToday && "bg-indigo-50/60"
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
