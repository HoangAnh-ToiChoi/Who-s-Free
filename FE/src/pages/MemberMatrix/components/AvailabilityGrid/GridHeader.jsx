import { Clock } from "lucide-react";
import { cn } from "~/lib/utils";

/**
 * GridHeader - Hàng tiêu đề 7 ngày trong tuần
 * Nằm trên đỉnh của lịch, hỗ trợ khe bù trừ scrollbar (scrollbar gutter) để thẳng hàng tuyệt đối với thân lưới bên dưới.
 */
function GridHeader({ weekDays, gutterWidth = 15 }) {
  return (
    <div className="flex border-b border-slate-200/90 bg-white text-center shadow-xs select-none shrink-0 z-10">
      {/* Cột góc: Icon đồng hồ (khớp chuẩn 70px của TimeColumn) */}
      <div className="w-[70px] shrink-0 flex items-center justify-center border-r border-slate-200/90 py-3 text-slate-400 bg-slate-50/80">
        <Clock size={16} />
      </div>

      {/* 7 cột ngày */}
      <div className="flex-1 grid grid-cols-7">
        {weekDays.map((day) => {
          const isWeekend = day.dayIndex >= 5;
          return (
            <div
              key={day.dateStr}
              className={cn(
                "border-r border-slate-200/90 last:border-r-0 py-2.5 px-1 flex flex-col items-center justify-center transition-colors",
                isWeekend && "bg-slate-50/50",
                day.isToday && "bg-indigo-50/50"
              )}
            >
              <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                {day.dayName}
              </span>

              {day.isToday ? (
                <div className="mt-0.5 flex flex-col items-center">
                  <span className="text-xs font-extrabold text-indigo-950">
                    {day.dateNum}
                  </span>
                  <span className="mt-0.5 rounded-full bg-indigo-600 px-2 py-0.2 text-[9px] font-bold text-white uppercase tracking-wider shadow-3xs">
                    Today
                  </span>
                </div>
              ) : (
                <span className="mt-0.5 text-xs font-bold text-slate-800">
                  {day.dateNum}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Khe đệm bù trừ chính xác độ rộng của thanh cuộn bên dưới */}
      {gutterWidth > 0 && (
        <div
          style={{ width: `${gutterWidth}px` }}
          className="shrink-0 bg-slate-50/60 border-l border-slate-200/80"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default GridHeader;
