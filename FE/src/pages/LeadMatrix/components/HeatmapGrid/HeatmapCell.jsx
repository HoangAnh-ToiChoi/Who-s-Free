import { cn } from "~/lib/utils";

/**
 * HeatmapCell - Ô đơn vị 30 phút trên lưới Heatmap
 * Thể hiện mức độ rảnh bằng màu Indigo thương hiệu với bo góc (radius nhẹ),
 * sắc thái hiện đại, mượt mà, không khô cứng.
 */
function HeatmapCell({
  dayIndex,
  blockStart,
  count,
  totalMembers,
  percent,
  isHighlighted,
  onClick,
}) {
  // Bảng màu Heatmap chuyển tiếp hài hoà theo tông màu chủ đạo Indigo
  const getCellStyle = (pct) => {
    if (pct === 0) {
      return "bg-transparent hover:bg-slate-100/60";
    }
    if (pct <= 25) {
      return "bg-indigo-50/90 text-indigo-700 border border-indigo-200/60 font-medium shadow-2xs hover:bg-indigo-100/80";
    }
    if (pct <= 50) {
      return "bg-indigo-100 text-indigo-800 border border-indigo-300/70 font-semibold shadow-2xs hover:bg-indigo-200/80";
    }
    if (pct <= 75) {
      return "bg-indigo-400 text-white border border-indigo-500/50 font-semibold shadow-xs hover:bg-indigo-500";
    }
    if (pct < 100) {
      return "bg-indigo-600 text-white border border-indigo-700/60 font-bold shadow-xs hover:bg-indigo-700";
    }
    // 100% Quorum (Tất cả đều rảnh): Gradient Indigo cao cấp, bóng nhẹ, viền ánh tím mềm mại
    return "bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-700 text-white font-bold shadow-sm ring-1.5 ring-indigo-400/80 hover:brightness-110";
  };

  const hasData = count > 0;
  const cellId =
    dayIndex !== undefined && blockStart !== undefined
      ? `heatmap-cell-${dayIndex}-${blockStart}`
      : undefined;

  return (
    <div className="flex h-8 w-full items-center justify-center border-r border-b border-slate-100/90 p-0.5">
      <button
        id={cellId}
        type="button"
        onClick={onClick}
        className={cn(
          "flex h-full w-full cursor-pointer items-center justify-center rounded-md text-[11px] transition-all duration-200 select-none",
          getCellStyle(percent),
          hasData && "hover:z-10 hover:scale-[1.02]",
          isHighlighted && "z-20 shadow-md ring-2 ring-amber-400 ring-offset-1",
        )}
      >
        {hasData ? `${count}/${totalMembers}` : ""}
      </button>
    </div>
  );
}

export default HeatmapCell;
