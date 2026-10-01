import { useTranslation } from "react-i18next";
import { UserX, TrendingUp, CalendarX2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { SLOT_BADGE_STYLES } from "~/data/uiConstants";
import { useOptimalAnalysis } from "../../hooks/useOptimalAnalysis";

/**
 * OptimalAnalysis - Sidebar panel trình bày bảng xếp hạng khung giờ vàng & khung giờ hạn chế
 * Tách biệt hoàn toàn phần giao diện (UI) và tính toán nghiệp vụ qua useOptimalAnalysis.
 */
function OptimalAnalysis({
  matrix,
  weekDays,
  totalMembers = 1,
  allMembers = [],
  onSelectSlot,
}) {
  const { t } = useTranslation();
  const { optimalSlots, conflictSlots } = useOptimalAnalysis({
    matrix,
    weekDays,
    totalMembers,
    allMembers,
  });

  return (
    <div className="flex flex-col gap-4 w-full select-none">
      {/* Top Optimal Slots - Bảng xếp hạng khung giờ vàng */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center">
            <TrendingUp size={14} className="text-emerald-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">{t("leadMatrix.optimalSlotsTitle")}</h3>
        </div>

        <div className="space-y-2">
          {optimalSlots.length > 0 ? (
            optimalSlots.map((slot, idx) => (
              <div
                key={slot.id || idx}
                onClick={() => onSelectSlot?.(slot.dayIndex, slot.blockStart, slot.dayName)}
                className="group flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.99]"
              >
                <div className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                    {slot.rank}
                  </span>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                    {slot.timeLabel}
                  </span>
                  <span
                    className={cn(
                      "ml-auto px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0",
                      SLOT_BADGE_STYLES[slot.badgeType] || SLOT_BADGE_STYLES.quorum
                    )}
                  >
                    {slot.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                  {slot.description}
                </p>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-6 px-3 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <CalendarX2 size={22} className="text-slate-400 mb-1.5" />
              <p className="text-xs text-slate-500 font-medium">
                {t("leadMatrix.noOptimalSlots")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Limited Slots - Khung giờ hạn chế (ít người chọn) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-lg bg-amber-50 border border-amber-200/80 flex items-center justify-center">
            <UserX size={14} className="text-amber-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">{t("leadMatrix.conflictSlotsTitle")}</h3>
          <span className="ml-auto text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/70">
            {t("leadMatrix.lowParticipation")}
          </span>
        </div>

        <div className="space-y-2">
          {conflictSlots.length > 0 ? (
            conflictSlots.map((slot, idx) => (
              <div
                key={slot.id || idx}
                onClick={() => onSelectSlot?.(slot.dayIndex, slot.blockStart, slot.dayName)}
                className="group flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 bg-slate-50/40 hover:border-amber-300 hover:bg-amber-50/30 transition-all cursor-pointer shadow-2xs active:scale-[0.99]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 group-hover:text-amber-900 transition-colors">
                    {slot.timeLabel}
                  </span>
                  <span
                    className={cn(
                      "ml-auto px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0",
                      SLOT_BADGE_STYLES[slot.badgeType] || SLOT_BADGE_STYLES.limited
                    )}
                  >
                    {slot.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                  {slot.description}
                </p>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-6 px-3 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <p className="text-xs text-slate-400 font-medium italic">
                {t("leadMatrix.noConflictSlots")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OptimalAnalysis;
