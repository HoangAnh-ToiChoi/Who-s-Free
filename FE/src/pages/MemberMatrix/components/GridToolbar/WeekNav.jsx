import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

/** Cụm điều hướng tuần ‹ Hôm nay ›. Dùng trong GridToolbar và (mobile) trên header màn Lead. */
/** canGoPrev/canGoNext = false: khoá nút khi tuần kế tiếp nằm ngoài khoảng khảo sát của phiên. */
function WeekNav({ onPrevWeek, onNextWeek, onToday, weekOffset = 0, canGoPrev = true, canGoNext = true, className }) {
  const { t } = useTranslation();
  // Nút giữa cho biết đang xem tuần nào so với hiện tại; bấm vào luôn về tuần này
  const label =
    weekOffset === 0 ? t("gridToolbar.thisWeek") : weekOffset > 0 ? t("gridToolbar.nextWeek") : t("gridToolbar.prevWeek");
  return (
    <div className={cn("flex items-center gap-1 bg-white border border-slate-200/90 rounded-xl p-1 shadow-2xs", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onPrevWeek}
        disabled={!canGoPrev}
        className="h-7 w-7 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
        aria-label={t("gridToolbar.prevWeek")}
      >
        <ChevronLeft size={16} />
      </Button>

      <Button
        type="button"
        variant="ghost"
        onClick={onToday}
        aria-label={t("gridToolbar.backToThisWeek")}
        className="h-7 min-w-[76px] px-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
      >
        {label}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onNextWeek}
        disabled={!canGoNext}
        className="h-7 w-7 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
        aria-label={t("gridToolbar.nextWeek")}
      >
        <ChevronRight size={16} />
      </Button>
    </div>
  );
}

export default WeekNav;
