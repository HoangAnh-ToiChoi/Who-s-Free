import { minutesToTimeString } from "../../helper/timeUtils";
import { cn } from "~/lib/utils";

/**
 * TimeColumn - Cột hiển thị các mốc thời gian bên trái (00:00 - 23:00)
 * Đồng bộ Zebra striping và phân định mốc giờ sắc nét.
 */
function TimeColumn({ hours }) {
  return (
    <div className="border-r border-slate-200/90 bg-slate-50/80 select-none shrink-0">
      {hours.map((hour) => (
        <div
          key={hour}
          className={cn(
            "h-16 border-b border-slate-200/90 relative text-[11px] font-semibold text-slate-500 text-center flex items-start justify-center",
            hour % 2 === 1 ? "bg-slate-100/40" : "bg-slate-50/60"
          )}
        >
          {/* Ẩn nhãn 00:00 ở mép trên cùng để không bị lẹm viền, bắt đầu hiển thị từ 01:00 */}
          {hour > 0 && (
            <span className="-top-2.5 relative bg-white px-1.5 py-0.5 rounded-md shadow-2xs border border-slate-200/90 font-medium text-slate-600">
              {minutesToTimeString(hour * 60)}
            </span>
          )}
        </div>
      ))}

      {/* Mốc 24:00 và khoảng dư sau 23h để không bị sát đáy */}
      <div className="h-14 relative text-[11px] font-semibold text-slate-500 text-center flex items-start justify-center bg-slate-100/40">
        <span className="-top-2.5 relative bg-white px-1.5 py-0.5 rounded-md shadow-2xs border border-slate-200/90 font-medium text-slate-600">
          24:00
        </span>
      </div>
    </div>
  );
}

export default TimeColumn;
