import { useTranslation } from "react-i18next";
import { CalendarDays, Clock, Info, Lock } from "lucide-react";
import { formatDateLabel, formatRange } from "~/utils/finalizeCandidates";

/**
 * FinalizedBanner - Nhãn "Lịch đã chốt" gọn, đặt ngay cạnh tên session trên header:
 * khung giờ đã chốt nổi bật; ghi chú của trưởng nhóm và quy định huỷ chốt nằm trong tooltip (biểu tượng ⓘ).
 * Dùng cho cả Lead và thành viên (readOnly).
 */
function FinalizedBanner({ finalized, readOnly = false }) {
  const { t } = useTranslation();
  if (!finalized) return null;

  const details = [
    finalized.note ? `${t("finalize.bannerNote")}: ${finalized.note}` : null,
    readOnly ? t("finalize.readOnlyHint") : null,
    t("finalize.leadOnlyHint"),
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div
      role="status"
      title={details}
      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-200 bg-linear-to-r from-emerald-50 to-white py-1 pr-3 pl-1 shadow-2xs"
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-500/30">
        <Lock size={13} />
      </span>
      <span className="text-[10px] font-bold tracking-wider text-emerald-700 uppercase">
        {t("finalize.bannerTitle")}
      </span>
      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-900">
        <CalendarDays size={13} className="text-emerald-600" />
        {formatDateLabel(finalized.date)}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
        <Clock size={11} />
        {formatRange(finalized.startMinutes, finalized.endMinutes)}
      </span>
      <Info size={14} aria-label={details} className="shrink-0 cursor-help text-emerald-600" />
    </div>
  );
}

export default FinalizedBanner;
