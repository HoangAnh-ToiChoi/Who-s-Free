import { useTranslation } from "react-i18next";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";
import { formatDateLabel, formatMinutes } from "~/utils/finalizeCandidates";
import { shortDateLabel } from "~/utils/finalizeTimeline";
import MemberAvatar from "../../MemberAvatar";

/** "9:00–12:00, 14:00–19:00": gộp các đoạn liền nhau của ngày */
function spanLabel(segments) {
  const spans = [];
  for (const seg of segments) {
    const last = spans[spans.length - 1];
    if (last && last[1] === seg.start) last[1] = seg.end;
    else spans.push([seg.start, seg.end]);
  }
  return spans.map(([s, e]) => `${formatMinutes(s)}–${formatMinutes(e)}`).join(", ");
}

/**
 * Cột trái của một ngày: dòng ngày (bấm để mở/thu gọn) + tên từng thành viên.
 * Khi đang chọn một khung trong ngày này: người rảnh trọn khung có ✓, người không rảnh mờ đi kèm "vắng".
 */
function TimelineDayLabels({ day, open, onToggle, present, hasSelection }) {
  const { t } = useTranslation();
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex h-10 w-full cursor-pointer items-center gap-1.5 border-b border-slate-100 bg-slate-50/80 px-2 text-left text-xs font-bold text-slate-800 hover:bg-slate-100 sm:px-3"
      >
        <Chevron size={14} className="shrink-0 text-slate-400" />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate">
            <span className="sm:hidden">{shortDateLabel(day.date)}</span>
            <span className="max-sm:hidden">{formatDateLabel(day.date)}</span>
          </span>
          {/* Các khoảng có người rảnh trong ngày: luôn thấy dù phần đó của trục đang nằm ngoài màn hình */}
          <span className="block truncate text-[10px] font-medium text-slate-400">{spanLabel(day.segments)}</span>
        </span>
      </button>

      {open &&
        day.rows.map((row) => {
          const isPresent = present.has(row.memberId);
          const isAbsent = hasSelection && !isPresent;
          return (
            <div key={row.memberId} className="flex h-8 items-center gap-2 border-b border-slate-100 px-2 sm:px-3">
              <MemberAvatar
                name={row.name}
                avatarUrl={row.avatarUrl}
                muted={isAbsent}
                className={cn("h-5 w-5 text-[10px]", isAbsent && "opacity-60")}
              />
              <span className={cn("min-w-0 flex-1 truncate text-xs font-medium", isAbsent ? "text-slate-400" : "text-slate-700")}>
                {row.name}
              </span>
              {hasSelection &&
                (isPresent ? (
                  <Check size={14} strokeWidth={3} className="shrink-0 text-emerald-600" aria-label={t("finalize.present")} />
                ) : (
                  <span className="shrink-0 text-[10px] font-semibold text-amber-700">{t("finalize.absent")}</span>
                ))}
            </div>
          );
        })}
    </div>
  );
}

export default TimelineDayLabels;
