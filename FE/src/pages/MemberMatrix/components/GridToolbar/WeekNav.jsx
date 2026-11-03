import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

/** Cụm điều hướng tuần ‹ Hôm nay ›. Dùng trong GridToolbar và (mobile) trên header màn Lead. */
function WeekNav({ onPrevWeek, onNextWeek, onToday, className }) {
  const { t } = useTranslation();
  return (
    <div className={cn("flex items-center gap-1 bg-white border border-slate-200/90 rounded-xl p-1 shadow-2xs", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onPrevWeek}
        className="h-7 w-7 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
        aria-label={t("gridToolbar.prevWeek")}
      >
        <ChevronLeft size={16} />
      </Button>

      <Button
        type="button"
        variant="ghost"
        onClick={onToday}
        className="h-7 px-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
      >
        {t("gridToolbar.today")}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onNextWeek}
        className="h-7 w-7 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
        aria-label={t("gridToolbar.nextWeek")}
      >
        <ChevronRight size={16} />
      </Button>
    </div>
  );
}

export default WeekNav;
