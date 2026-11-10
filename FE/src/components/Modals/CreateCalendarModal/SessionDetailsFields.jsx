import { useTranslation } from "react-i18next";
import { Zap } from "lucide-react";
import { cn } from "~/lib/utils";
import { Input } from "~/components/ui/input";

const QUORUM_GOALS = [70, 80, 100];

/** Mục tiêu quorum, địa điểm và ghi chú đồng bộ trong form tạo phiên. */
function SessionDetailsFields({ quorumPercent, onQuorumChange, location, onLocationChange }) {
  const { t } = useTranslation();
  return (
    <>
    {/* Field: Quorum Goal & Location */}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
          {t("createCalendarModal.quorumGoal")}
        </label>
        <div className="flex items-center gap-1.5">
          {QUORUM_GOALS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onQuorumChange(value)}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-center text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                quorumPercent === value
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "border border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100"
              )}
            >
              {value}%
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
          {t("createCalendarModal.locationMode")}
        </label>
        <Input
          type="text"
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
          placeholder={t("createCalendarModal.locationPlaceholder")}
          className="h-9 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs text-slate-800 hover:border-slate-300 hover:bg-white"
        />
      </div>
    </div>

    {/* Sync callout */}
    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 p-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
          <Zap size={14} />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-slate-800">
            {t("createCalendarModal.calDavActive")}
          </span>
          <span className="text-[11px] text-slate-400">
            {t("createCalendarModal.calDavDesc")}
          </span>
        </div>
      </div>
      <span className="rounded-md bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
        {t("common.live")}
      </span>
    </div>
    </>
  );
}

export default SessionDetailsFields;
