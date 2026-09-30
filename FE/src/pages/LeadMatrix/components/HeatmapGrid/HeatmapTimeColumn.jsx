import { minutesToTimeString } from "~/utils/timeUtils";
import { cn } from "~/lib/utils";

/**
 * HeatmapTimeColumn - Cột mốc giờ bên trái cho lưới Heatmap
 * Hiển thị nhãn giờ theo block 30 phút (chỉ hiện giờ chẵn)
 */
function HeatmapTimeColumn({ blocks }) {
  return (
    <div className="flex flex-col shrink-0 w-[60px] border-r border-slate-200/60">
      {blocks.map((blockStart, idx) => {
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
