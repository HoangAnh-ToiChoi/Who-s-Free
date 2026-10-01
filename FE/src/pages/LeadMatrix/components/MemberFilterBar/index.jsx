import { useTranslation } from "react-i18next";
import { cn } from "~/lib/utils";
import MemberChip from "./MemberChip";

/**
 * MemberFilterBar - Thanh lọc thành viên cho LeadMatrix
 * Hỗ trợ: Preset filter (All, Leadership, Core) + Toggle từng member
 * Tuân thủ SRP: Tách riêng MemberChip ra file độc lập.
 */
function MemberFilterBar({
  activePreset,
  allMembers,
  selectedMemberIds,
  onPresetChange,
  onToggleMember,
}) {
  const { t } = useTranslation();

  const presetLabels = {
    all: t("leadMatrix.filterAll"),
    leadership: t("leadMatrix.filterLeadership"),
    core: t("leadMatrix.filterCore"),
  };

  return (
    <div className="flex flex-col gap-3 py-3 px-1 select-none">
      {/* Preset buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1">
          {t("leadMatrix.filterLabel")}
        </span>
        {Object.entries(presetLabels).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onPresetChange(key)}
            className={cn(
              "h-7 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer border",
              activePreset === key
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Member chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {allMembers.map((member) => (
          <MemberChip
            key={member.memberId || member.id}
            member={member}
            isSelected={selectedMemberIds.includes(member.memberId || member.id)}
            onToggle={() => onToggleMember(member.memberId || member.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default MemberFilterBar;
