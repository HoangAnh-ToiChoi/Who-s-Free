import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { cn } from "~/lib/utils";
import { SLOT_BADGE_STYLES } from "~/data/uiConstants";
import http from "~/utils/http";

/**
 * OptimalAnalysis - Sidebar panel phân tích khung giờ vàng & xung đột
 * Tải trực tiếp dữ liệu từ db.json (/optimalSlots và /conflictSlots)
 */
function OptimalAnalysis() {
  const { t } = useTranslation();
  const [optimalSlots, setOptimalSlots] = useState([]);
  const [conflictSlots, setConflictSlots] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function loadAnalysis() {
      try {
        const [opts, confs] = await Promise.all([
          http.get("/optimalSlots").catch(() => []),
          http.get("/conflictSlots").catch(() => []),
        ]);
        if (isMounted) {
          if (Array.isArray(opts)) setOptimalSlots(opts);
          if (Array.isArray(confs)) setConflictSlots(confs);
        }
      } catch (err) {
        console.warn("Could not load optimal/conflict slots from db.json:", err);
      }
    }
    loadAnalysis();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top Optimal Slots */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center">
            <TrendingUp size={14} className="text-emerald-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">{t("leadMatrix.optimalSlotsTitle")}</h3>
        </div>

        <div className="space-y-2">
          {optimalSlots.map((slot, idx) => (
            <div
              key={slot.id || idx}
              className="group flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {slot.rank}
                </span>
                <span className="text-xs font-bold text-slate-800">{slot.timeLabel}</span>
                <span
                  className={cn(
                    "ml-auto px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0",
                    SLOT_BADGE_STYLES[slot.badgeType] || SLOT_BADGE_STYLES.quorum
                  )}
                >
                  {slot.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">{slot.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Conflict Slots */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-lg bg-rose-50 border border-rose-200/80 flex items-center justify-center">
            <AlertTriangle size={14} className="text-rose-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">{t("leadMatrix.conflictSlotsTitle")}</h3>
        </div>

        <div className="space-y-2">
          {conflictSlots.map((slot, idx) => (
            <div
              key={slot.id || idx}
              className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 bg-slate-50/40"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">{slot.timeLabel}</span>
                <span
                  className={cn(
                    "ml-auto px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0",
                    SLOT_BADGE_STYLES[slot.badgeType] || SLOT_BADGE_STYLES.conflict
                  )}
                >
                  {slot.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">{slot.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default OptimalAnalysis;
