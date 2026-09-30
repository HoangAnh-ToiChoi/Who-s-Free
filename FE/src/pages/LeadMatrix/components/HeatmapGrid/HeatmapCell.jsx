import { cn } from "~/lib/utils";

/**
 * HeatmapCell - Ô đơn vị 30 phút trên lưới Heatmap
 * Đổi màu động theo % quorum (tông Indigo thương hiệu)
 */
function HeatmapCell({ count, totalMembers, percent, isHighlighted, onClick }) {
  // Bảng màu Heatmap chuẩn thương hiệu Who's Free (Indigo gradient)
  const getCellStyle = (pct) => {
    if (pct === 0) return "bg-slate-50/80 text-slate-300";
    if (pct <= 25) return "bg-indigo-50 text-indigo-400";
    if (pct <= 50) return "bg-indigo-100 text-indigo-600";
    if (pct <= 75) return "bg-indigo-300 text-white";
    if (pct < 100) return "bg-indigo-500 text-white";
    return "bg-indigo-600 text-white ring-2 ring-emerald-400 ring-inset";
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "h-8 w-full flex items-center justify-center text-[11px] font-semibold transition-all duration-150 cursor-pointer border-b border-r border-slate-100/80",
        "hover:ring-2 hover:ring-indigo-400/60 hover:ring-inset hover:z-10",
        getCellStyle(percent),
        isHighlighted && "ring-2 ring-amber-400 ring-inset z-10"
      )}
    >
      {count > 0 ? `${count}/${totalMembers}` : ""}
    </button>
  );
}

export default HeatmapCell;
