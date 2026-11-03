import { Clock } from "lucide-react";
import { cn } from "~/lib/utils";

/**
 * GridHeader - Hàng tiêu đề 7 ngày, sticky top trong khung cuộn của lưới.
 * Ô góc sticky cả 2 chiều để luôn che lên cột giờ khi vuốt ngang trên mobile.
 */
function GridHeader({ weekDays }) {
  return (
    <div className="sticky top-0 z-40 flex border-b border-slate-200/90 bg-white text-center shadow-xs select-none">
      <div className="sticky left-0 z-50 flex w-12 shrink-0 items-center justify-center border-r border-slate-200/90 bg-slate-50 py-3 text-slate-400 md:w-[70px]">
        <Clock size={16} />
      </div>

      <div className="flex-1 grid grid-cols-7">
        {weekDays.map((day) => {
          const isWeekend = day.dayIndex >= 5;
          return (
            <div
              key={day.dateStr}
              className={cn(
                "snap-start border-r border-slate-200/90 last:border-r-0 py-2.5 px-1 flex flex-col items-center justify-center transition-colors",
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

    </div>
  );
}

export default GridHeader;
