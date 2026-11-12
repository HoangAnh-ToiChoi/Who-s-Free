import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";

const GROUP = "flex rounded-lg bg-slate-100 p-0.5";
const STEPS = [
  { dir: -1, Icon: ChevronLeft, label: "finalize.scrollEarlier" },
  { dir: 1, Icon: ChevronRight, label: "finalize.scrollLater" },
];

/** Tiêu đề + nút ‹ › (chỉ khi bảng cuộn được) + chọn khoảng hiển thị Giờ rảnh / Cả ngày. */
function TimelineToolbar({ canScroll, atStart, atEnd, onStep, mode, onModeChange }) {
  const { t } = useTranslation();
  const atEdge = { [-1]: atStart, 1: atEnd };

  return (
    <div className="flex items-center gap-1.5">
      <p className="mr-auto text-xs font-semibold text-slate-600">{t("finalize.timelineTitle")}</p>

      {canScroll && (
        <div className={GROUP}>
          {STEPS.map(({ dir, Icon, label }) => (
            <button
              key={dir}
              type="button"
              disabled={atEdge[dir]}
              onClick={() => onStep(dir)}
              aria-label={t(label)}
              title={t(label)}
              className="flex h-6 w-7 cursor-pointer items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-white disabled:cursor-default disabled:text-slate-300 disabled:hover:bg-transparent"
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
      )}

      <div className={GROUP} role="group">
        {["free", "full"].map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={mode === key}
            onClick={() => onModeChange(key)}
            className={cn(
              "cursor-pointer rounded-md px-2 py-1 text-[11px] font-semibold whitespace-nowrap transition-colors",
              mode === key ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {t(key === "free" ? "finalize.zoomFree" : "finalize.zoomFull")}
          </button>
        ))}
      </div>
    </div>
  );
}

export default TimelineToolbar;
