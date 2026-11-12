import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp, UserX } from "lucide-react";
import { cn } from "~/lib/utils";
import { formatDateLabel, formatRange } from "~/utils/finalizeCandidates";
import { rankSuggestions } from "~/utils/finalizeSuggestions";
import { hasResponded } from "~/utils/members";

const TABS = [
  { key: "optimal", icon: TrendingUp, labelKey: "finalize.tabOptimal" },
  { key: "limited", icon: UserX, labelKey: "finalize.tabLimited" },
];

/**
 * FinalizeSuggestions - Gợi ý khung giờ trong modal Chốt lịch (tối ưu / hạn chế), tính trên mọi ngày của phiên.
 * Bấm một gợi ý → chọn luôn khung giờ đó (onPick), Lead vẫn chỉnh tiếp được ở danh sách ô bên dưới.
 */
function FinalizeSuggestions({ cells, members, selection, onPick }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState("optimal");

  const { names, total, suggestions } = useMemo(() => {
    const responded = members.filter(hasResponded);
    return {
      names: new Map(members.map((m) => [m.memberId, m.memberName || "Thành viên"])),
      total: responded.length,
      suggestions: rankSuggestions(cells, responded.length),
    };
  }, [cells, members]);

  const nameList = (ids) => ids.map((id) => names.get(id)).filter(Boolean).join(", ");
  const describe = (run) => {
    if (tab === "optimal") return t("finalize.availableNames", { names: nameList(run.memberIds) });
    const present = new Set(run.memberIds);
    const missing = members.filter((m) => hasResponded(m) && !present.has(m.memberId)).map((m) => m.memberId);
    return t("finalize.missingNames", { names: nameList(missing) });
  };
  const isPicked = (run) =>
    selection && selection.date === run.date && selection.start === run.start && selection.end === run.end;
  const runs = suggestions[tab];

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="whitespace-nowrap text-xs font-semibold text-slate-600">{t("finalize.suggestTitle")}</p>
        <div className="flex rounded-lg bg-slate-100 p-0.5" role="tablist">
          {TABS.map(({ key, icon: Icon, labelKey }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                "flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold transition-colors",
                tab === key ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Icon size={12} className={key === "optimal" ? "text-emerald-600" : "text-amber-600"} />
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-0.5 text-[11px] text-slate-400">{t("finalize.suggestHint")}</p>

      {runs.length > 0 ? (
        <div className="mt-2 flex flex-col gap-1.5">
          {runs.map((run, idx) => (
            <button
              key={`${run.date}|${run.start}`}
              type="button"
              aria-pressed={Boolean(isPicked(run))}
              onClick={() => onPick({ date: run.date, start: run.start, end: run.end })}
              className={cn(
                "flex cursor-pointer flex-col gap-0.5 rounded-xl border px-3 py-2 text-left transition-colors",
                isPicked(run)
                  ? "border-indigo-500 bg-indigo-50"
                  : tab === "optimal"
                    ? "border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                    : "border-slate-200 hover:border-amber-300 hover:bg-amber-50/40"
              )}
            >
              <span className="flex items-center gap-2">
                {tab === "optimal" && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-[10px] font-bold text-white">
                    {idx + 1}
                  </span>
                )}
                <span className="min-w-0 truncate text-xs font-bold text-slate-800">
                  {formatDateLabel(run.date)}, {formatRange(run.start, run.end)}
                </span>
                <span
                  className={cn(
                    "ml-auto shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold",
                    run.count === total
                      ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                      : "border-amber-200/80 bg-amber-50 text-amber-700"
                  )}
                >
                  {run.count === total ? t("finalize.allFree") : t("finalize.countOfTotal", { count: run.count, total })}
                </span>
              </span>
              <span className="line-clamp-1 text-[11px] text-slate-500">{describe(run)}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-3 py-3 text-center text-xs text-slate-400">
          {t("finalize.suggestEmpty")}
        </p>
      )}
    </div>
  );
}

export default FinalizeSuggestions;
