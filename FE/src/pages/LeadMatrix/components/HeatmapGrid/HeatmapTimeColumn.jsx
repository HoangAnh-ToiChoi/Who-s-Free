import { minutesToTimeString } from "~/utils/timeUtils";
import { cn } from "~/lib/utils";

/**
 * HeatmapTimeColumn - Cột mốc giờ bên trái cho lưới Heatmap
 * Hiển thị nhãn giờ theo block 30 phút (chỉ hiện giờ chẵn). Sticky left, nền đặc vì các cột ngày trượt bên dưới.
 */
function HeatmapTimeColumn({ blocks }) {
  return (
    <div className="sticky left-0 z-30 flex w-12 shrink-0 flex-col border-r border-slate-200/60 bg-white shadow-[4px_0_6px_-4px_rgba(15,23,42,0.12)] md:w-[60px]">
      {blocks.map((blockStart) => {
        const isFullHour = blockStart % 60 === 0;
        return (
          <div
            key={blockStart}
            className={cn(
              "h-8 flex items-center justify-end pr-2 text-[10px] font-medium border-b border-slate-100/80",
              isFullHour ? "text-slate-500" : "text-slate-300"
            )}
          >
            {isFullHour ? minutesToTimeString(blockStart) : ""}
          </div>
        );
      })}
    </div>
  );
}

export default HeatmapTimeColumn;
