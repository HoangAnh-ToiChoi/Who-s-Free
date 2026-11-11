import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "~/lib/utils";
import { useHorizontalScroll } from "~/hooks";
import MemberChip from "./MemberChip";

// Từ 7 người trở lên chỉ hiện ảnh (không tên) để cả nhóm nằm trên 1 hàng; nhóm nhỏ hiện cả tên cho dễ đọc
const COMPACT_FROM = 7;
const isMobile = () => window.matchMedia("(max-width: 639px)").matches;

/**
 * MemberFilterBar - Thanh lọc thành viên cho LeadMatrix: nút preset (Tất cả, Ban lãnh đạo) + dải thành viên.
 * Dải thành viên luôn 1 hàng thay vì xuống nhiều hàng: cuộn ngang (lăn chuột cũng cuộn ngang), mép nào còn người
 * bị khuất thì mờ dần, cuộn tới tận cùng phía đó thì hết mờ.
 * members: thành viên cần hiện theo chế độ (Ban lãnh đạo → chỉ owner/lead, người khác ẩn hẳn).
 * Mobile: chỉ 1 nút "Ban lãnh đạo" bật/tắt (tắt = tất cả, ẩn dải thành viên để nhường chỗ cho lưới);
 * bật thì hiện ảnh + tên owner/lead cạnh nút để biết đang xem lịch của ai.
 */
function MemberFilterBar({ activePreset, members, selectedMemberIds, onPresetChange, onToggleMember }) {
  const { t } = useTranslation();
  const selected = useMemo(() => new Set(selectedMemberIds), [selectedMemberIds]);
  const compact = members.length >= COMPACT_FROM;
  const leadershipOn = activePreset === "leadership";
  const { attach, atStart, atEnd } = useHorizontalScroll();
  const fade = `linear-gradient(to right, ${atStart ? "black" : "transparent"}, black 24px, black calc(100% - 24px), ${atEnd ? "black" : "transparent"})`;

  const presetLabels = {
    all: t("leadMatrix.filterAll"),
    leadership: t("leadMatrix.filterLeadership"),
  };

  return (
    <div className="flex min-w-0 items-center gap-2 py-1.5 px-1 select-none sm:gap-3 sm:py-3">
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden sm:inline text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1">
          {t("leadMatrix.filterLabel")}
        </span>
        {Object.entries(presetLabels).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onPresetChange(key === "leadership" && activePreset === "leadership" && isMobile() ? "all" : key)}
            aria-pressed={key === "leadership" ? activePreset === "leadership" : undefined}
            className={cn(
              "h-7 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer border whitespace-nowrap",
              key === "all" && "max-sm:hidden",
              activePreset === key
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <span className={cn("h-5 w-px shrink-0 bg-slate-200", !leadershipOn && "max-sm:hidden")} aria-hidden="true" />

      {/* 1 hàng, cuộn ngang; padding dọc để vòng chọn (ring) của ảnh không bị cắt */}
      <div
        ref={attach}
        style={{ maskImage: fade, WebkitMaskImage: fade }}
        className={cn(
          "min-w-0 flex-1 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          !leadershipOn && "max-sm:hidden"
        )}
      >
        <div className={cn("flex w-max items-center px-1", compact ? "gap-1.5" : "gap-2")}>
          {members.map((member) => (
            <MemberChip
              key={member.memberId}
              member={member}
              isSelected={selected.has(member.memberId)}
              compact={compact}
              notRespondedLabel={t("leadMatrix.notResponded")}
              onToggle={onToggleMember}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default MemberFilterBar;
