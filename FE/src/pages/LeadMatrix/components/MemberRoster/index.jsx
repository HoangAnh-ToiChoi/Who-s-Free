import { useTranslation } from "react-i18next";
import { cn } from "~/lib/utils";
import { useHorizontalScroll } from "~/hooks";
import MemberChip from "./MemberChip";
import { isNarrowScreen } from "~/utils/viewport";

// Từ 7 người trở lên chỉ hiện ảnh (không tên) để cả nhóm nằm trên 1 hàng; nhóm nhỏ hiện cả tên cho dễ đọc
const COMPACT_FROM = 7;

/**
 * MemberRoster - Dải XEM thành viên của màn Lead: Tất cả / Ban lãnh đạo + ảnh, tên. Chỉ để biết nhóm có ai,
 * ai là trưởng nhóm / lead — không lọc lưới lịch bên dưới (lưới luôn tính cả nhóm).
 * Dải luôn 1 hàng: cuộn ngang (lăn chuột cũng cuộn ngang), mép còn người bị khuất thì mờ dần.
 * Mobile: chỉ 1 nút "Ban lãnh đạo" bật/tắt (tắt = ẩn dải để nhường chỗ cho lưới).
 */
function MemberRoster({ view, members, onViewChange }) {
  const { t } = useTranslation();
  const compact = members.length >= COMPACT_FROM;
  const leadershipOn = view === "leadership";
  const { attach, atStart, atEnd } = useHorizontalScroll();
  const fade = `linear-gradient(to right, ${atStart ? "black" : "transparent"}, black 24px, black calc(100% - 24px), ${atEnd ? "black" : "transparent"})`;

  const viewLabels = {
    all: t("leadMatrix.filterAll"),
    leadership: t("leadMatrix.filterLeadership"),
  };

  return (
    <div className="flex min-w-0 items-center gap-2 py-1.5 px-1 select-none sm:gap-3 sm:py-3">
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden sm:inline text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1">
          {t("leadMatrix.rosterLabel")}
        </span>
        {Object.entries(viewLabels).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onViewChange(key === "leadership" && leadershipOn && isNarrowScreen() ? "all" : key)}
            aria-pressed={view === key}
            className={cn(
              "h-7 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer border whitespace-nowrap",
              key === "all" && "max-sm:hidden",
              view === key
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <span className={cn("h-5 w-px shrink-0 bg-slate-200", !leadershipOn && "max-sm:hidden")} aria-hidden="true" />

      {/* 1 hàng, cuộn ngang */}
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
              compact={compact}
              notRespondedLabel={t("leadMatrix.notResponded")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default MemberRoster;
