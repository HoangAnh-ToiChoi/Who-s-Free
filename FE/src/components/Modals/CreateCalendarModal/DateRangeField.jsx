import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";
import { useClickOutside } from "~/hooks";
import {
  buildMonthGrid,
  formatDateRangeLabel,
  parseISODate,
  pickRangeDate,
  toISODateString,
} from "~/utils/dateUtils";

const WEEKDAYS = { vi: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"], en: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] };

/**
 * Ô chọn khoảng ngày khảo sát: bấm mở lịch tháng nhỏ, bấm ngày bắt đầu rồi ngày kết thúc.
 * value: { start, end } dạng "YYYY-MM-DD" (end có thể null khi đang chọn dở) hoặc null.
 */
function DateRangeField({ value, onChange, hasError }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || i18n.language;
  const isVi = String(lang).startsWith("vi");
  const todayStr = toISODateString(new Date());

  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const base = value?.start ? parseISODate(value.start) : new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });
  const [hoverDate, setHoverDate] = useState(null);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));

  const cells = useMemo(() => buildMonthGrid(month.year, month.month), [month]);
  const monthTitle = new Date(month.year, month.month, 1).toLocaleDateString(isVi ? "vi-VN" : "en-US", {
    month: "long",
    year: "numeric",
  });
  const isCurrentMonth = (() => {
    const now = new Date();
    return month.year === now.getFullYear() && month.month === now.getMonth();
  })();

  const shiftMonth = (delta) =>
    setMonth(({ year, month: m }) => {
      const d = new Date(year, m + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const handlePick = (dateStr) => {
    const next = pickRangeDate(value, dateStr);
    onChange(next);
    if (next.end) setOpen(false);
  };

  // Đang chọn dở: rê chuột để xem trước khoảng sẽ chọn
  const rangeEnd = value?.end || (value?.start && hoverDate && hoverDate >= value.start ? hoverDate : null);
  const label = value?.start && value?.end ? formatDateRangeLabel(value.start, value.end, lang) : null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-invalid={hasError || undefined}
        className={cn(
          "flex h-10 w-full cursor-pointer items-center justify-between rounded-xl border px-3.5 text-sm transition-all outline-none select-none",
          hasError
            ? "border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/15"
            : open
              ? "border-indigo-600 bg-white ring-2 ring-indigo-500/20"
              : "border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white"
        )}
      >
        <div className="flex items-center gap-2 text-xs">
          <CalendarDays size={14} className={cn("shrink-0", hasError ? "text-rose-500" : "text-slate-400")} />
          <span className={cn("truncate", label ? "text-slate-800" : hasError ? "text-rose-500" : "text-slate-400")}>
            {label || t("createCalendarModal.datePlaceholder")}
          </span>
        </div>
        <ChevronDown size={14} className={cn("text-slate-400 transition-transform duration-200 shrink-0", open && "rotate-180")} />
      </button>

      {hasError && <p className="mt-1 text-[11px] font-medium text-rose-500">{t("createCalendarModal.errorDateRequired")}</p>}

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1.5 w-[280px] max-w-full rounded-xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-200/60 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              disabled={isCurrentMonth}
              aria-label={t("createCalendarModal.prevMonth")}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs font-semibold text-slate-800 capitalize">{monthTitle}</span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label={t("createCalendarModal.nextMonth")}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-slate-400">
            {WEEKDAYS[isVi ? "vi" : "en"].map((d) => (
              <span key={d} className="py-1">{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5" onMouseLeave={() => setHoverDate(null)}>
            {cells.map((cell) => {
              const isPast = cell.dateStr < todayStr;
              const isStart = cell.dateStr === value?.start;
              const isEnd = cell.dateStr === rangeEnd;
              const inRange = value?.start && rangeEnd && cell.dateStr > value.start && cell.dateStr < rangeEnd;
              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  disabled={isPast}
                  onClick={() => handlePick(cell.dateStr)}
                  onMouseEnter={() => setHoverDate(cell.dateStr)}
                  className={cn(
                    "h-8 text-xs transition-colors",
                    isPast ? "cursor-not-allowed text-slate-300" : "cursor-pointer",
                    !isPast && !cell.inMonth && "text-slate-400",
                    !isPast && cell.inMonth && "text-slate-700",
                    inRange && "bg-indigo-50 text-indigo-700",
                    (isStart || isEnd) && "rounded-lg bg-indigo-600 font-semibold text-white",
                    !isStart && !isEnd && !inRange && !isPast && "rounded-lg hover:bg-slate-100",
                    cell.dateStr === todayStr && !isStart && !isEnd && "font-bold text-indigo-600"
                  )}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <p className="mt-2 text-center text-[11px] text-slate-500">
            {value?.start && !value?.end ? t("createCalendarModal.pickEndHint") : t("createCalendarModal.pickStartHint")}
          </p>
        </div>
      )}
    </div>
  );
}

export default DateRangeField;
