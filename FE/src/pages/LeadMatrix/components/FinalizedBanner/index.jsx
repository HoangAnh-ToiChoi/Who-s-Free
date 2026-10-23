import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";
import { formatDateLabel, formatRange } from "~/utils/finalizeCandidates";

/**
 * FinalizedBanner - Dải thông báo lịch đã chốt (khung giờ + ghi chú), dùng cho Lead và thành viên (readOnly)
 */
function FinalizedBanner({ finalized, readOnly = false }) {
  const { t } = useTranslation();
  if (!finalized) return null;

  return (
    <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
      <Lock size={14} className="shrink-0 text-emerald-600" />
      <span>
        {t("finalize.banner", {
          when: `${formatDateLabel(finalized.date)}, ${formatRange(finalized.startMinutes, finalized.endMinutes)}`,
        })}
      </span>
      {readOnly && <span className="font-normal text-emerald-700">{t("finalize.readOnlyHint")}</span>}
      {finalized.note && <span className="font-normal text-emerald-700">· {finalized.note}</span>}
    </div>
  );
}

export default FinalizedBanner;
