import { useTranslation } from "react-i18next";
import { cn } from "~/lib/utils";

/**
 * MemberFilterBar - Thanh lọc thành viên cho LeadMatrix
 * Hỗ trợ: Preset filter (All, Leadership, Core) + Toggle từng member
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
        {allMembers.map((member) => {
          const isSelected = selectedMemberIds.includes(member.memberId);
          return (
            <button
              key={member.memberId}
              onClick={() => onToggleMember(member.memberId)}
              className={cn(
                "flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium transition-all cursor-pointer border",
                isSelected
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200/80 shadow-sm"
                  : "bg-slate-50 text-slate-400 border-slate-200/60 line-through opacity-60 hover:opacity-80"
              )}
            >
              <img
                src={member.avatarUrl}
                alt={member.memberName}
                className="h-5 w-5 rounded-full object-cover shrink-0"
              />
              <span className="truncate max-w-[100px]">{member.memberName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default MemberFilterBar;
