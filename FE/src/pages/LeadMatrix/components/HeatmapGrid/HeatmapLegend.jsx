import { useTranslation } from "react-i18next";

/** Chú thích thang màu mức độ rảnh dưới lưới Heatmap. */
function HeatmapLegend() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1.5 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[11px] font-medium text-slate-500">
      <span className="font-semibold text-slate-600">
        {t("leadMatrix.legendLabel")}
      </span>
      <div className="flex items-center gap-1.5">
        <div className="h-3.5 w-5 rounded-md border border-slate-200 bg-white shadow-2xs" />
        <span>0%</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-3.5 w-5 rounded-md border border-indigo-200/60 bg-indigo-50 shadow-2xs" />
        <span>25%</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-3.5 w-5 rounded-md border border-indigo-300/70 bg-indigo-100 shadow-2xs" />
        <span>50%</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-3.5 w-5 rounded-md border border-indigo-500/50 bg-indigo-400 shadow-xs" />
        <span>75%</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="ring-1.5 h-3.5 w-5 rounded-md bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-xs ring-indigo-400/80" />
        <span className="font-semibold text-indigo-700">100%</span>
      </div>
    </div>
  );
}

export default HeatmapLegend;
