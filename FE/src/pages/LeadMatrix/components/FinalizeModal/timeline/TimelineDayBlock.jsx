import { useTranslation } from "react-i18next";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";
import { formatDateLabel, formatMinutes, formatRange } from "~/utils/finalizeCandidates";
import { heatLevel, shortDateLabel } from "~/utils/finalizeTimeline";
import MemberAvatar from "../../MemberAvatar";
import { useTimelineDrag } from "./useTimelineDrag";

// Cùng thang màu với heatmap: càng đông người càng đậm
const LEVEL_CLASS = [
  "bg-indigo-100 text-indigo-800",
  "bg-indigo-200 text-indigo-800",
  "bg-indigo-400 text-white",
  "bg-indigo-500 text-white",
  "bg-indigo-600 text-white",
];
const LABEL_MIN_PX = 64;
// Ô tên ghim bên trái (như cột đầu của Excel): nền che phần giờ chạy bên dưới khi cuộn ngang; viền dưới nằm trên ô
// (không nằm trên dòng) để dải chọn không lọt qua khe viền
const STICKY_CELL = "sticky left-0 z-20 shrink-0 border-r border-b border-r-slate-200 border-b-slate-100";

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
 * Một ngày trên timeline: mỗi dòng gồm ô tên (ghim trái) và phần giờ đi liền nhau, nên tên không bao giờ lệch dòng.
 * Dòng ngày: thanh tổng đậm nhạt theo số người (chạm/kéo để chọn) — bấm ô ngày để mở/thu gọn.
 * Mở ra: mỗi thành viên một dòng; đang chọn khung trong ngày này thì ✓ người có mặt, mờ + "vắng" người không rảnh.
 */
function TimelineDayBlock({ day, open, onToggle, total, labelWidth, width, x, cellKeys, range, pxPerHour, selection, present, onSelect }) {
  const { t } = useTranslation();
  const drag = useTimelineDrag({ day, cellKeys, range, pxPerHour, selection, onSelect });
  const sel = selection?.date === day.date ? selection : null;
  const Chevron = open ? ChevronDown : ChevronRight;
  const isEdge = (i, side) => {
    const other = day.segments[i + (side === "left" ? -1 : 1)];
    return !other || (side === "left" ? other.end !== day.segments[i].start : other.start !== day.segments[i].end);
  };

  return (
    <div className="relative">
      {sel && open && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-1 z-0 rounded-md border-x-2 border-dashed border-indigo-500 bg-indigo-500/10"
          style={{ left: labelWidth + x(sel.start), width: x(sel.end) - x(sel.start) }}
        />
      )}

      <div className="flex h-11">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          style={{ width: labelWidth }}
          className={cn(STICKY_CELL, "flex cursor-pointer items-center gap-1.5 bg-slate-50 px-2 text-left text-xs font-bold text-slate-800 hover:bg-slate-100 sm:px-3")}
        >
          <Chevron size={14} className="shrink-0 text-slate-400" />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate">
              <span className="sm:hidden">{shortDateLabel(day.date)}</span>
              <span className="max-sm:hidden">{formatDateLabel(day.date)}</span>
            </span>
            {/* Các khoảng có người rảnh: luôn thấy dù phần đó của trục đang nằm ngoài màn hình */}
            <span className="block truncate text-[10px] font-medium text-slate-400">{spanLabel(day.segments)}</span>
          </span>
        </button>

        <div {...drag.bar} className="relative shrink-0 cursor-pointer touch-pan-x select-none border-b border-slate-100 bg-slate-50/60" style={{ width }}>
          {day.segments.map((seg, i) => {
            const w = x(seg.end) - x(seg.start);
            return (
              <div
                key={seg.start}
                title={`${formatRange(seg.start, seg.end)} · ${seg.count}/${total}`}
                className={cn(
                  "absolute top-2.5 flex h-6 items-center justify-center text-[11px] font-bold",
                  LEVEL_CLASS[heatLevel(seg.count, total)],
                  isEdge(i, "left") && "rounded-l-md",
                  isEdge(i, "right") && "rounded-r-md"
                )}
                style={{ left: x(seg.start), width: w }}
              >
                {w >= 18 && seg.count}
              </div>
            );
          })}

          {sel && (
            <>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-2 h-7 rounded-md border-2 border-indigo-950"
                style={{ left: x(sel.start), width: x(sel.end) - x(sel.start) }}
              />
              {["start", "end"].map((edge) => (
                <div
                  key={edge}
                  role="slider"
                  aria-label={edge === "start" ? "Giờ bắt đầu" : "Giờ kết thúc"}
                  aria-valuenow={edge === "start" ? sel.start : sel.end}
                  {...drag.handle(edge)}
                  className="absolute top-1/2 z-10 flex h-9 w-6 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center"
                  style={{ left: x(edge === "start" ? sel.start : sel.end) }}
                >
                  <span className="h-6 w-2 rounded-full border-2 border-indigo-600 bg-white shadow-sm" />
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {open &&
        day.rows.map((row) => {
          const isPresent = present.has(row.memberId);
          const isAbsent = Boolean(sel) && !isPresent;
          return (
            <div key={row.memberId} className="flex h-8">
              <div style={{ width: labelWidth }} className={cn(STICKY_CELL, "flex items-center gap-2 bg-white px-2 sm:px-3")}>
                <MemberAvatar
                  name={row.name}
                  avatarUrl={row.avatarUrl}
                  muted={isAbsent}
                  className={cn("h-5 w-5 text-[10px]", isAbsent && "opacity-60")}
                />
                <span className={cn("min-w-0 flex-1 truncate text-xs font-medium", isAbsent ? "text-slate-400" : "text-slate-700")}>
                  {row.name}
                </span>
                {sel &&
                  (isPresent ? (
                    <Check size={14} strokeWidth={3} className="shrink-0 text-emerald-600" aria-label={t("finalize.present")} />
                  ) : (
                    <span className="shrink-0 text-[10px] font-semibold text-amber-700">{t("finalize.absent")}</span>
                  ))}
              </div>
              <div className="relative shrink-0 border-b border-slate-100" style={{ width }}>
                {row.intervals.map(([s, e]) => {
                  const w = x(e) - x(s);
                  return (
                    <div
                      key={s}
                      className="absolute top-1.5 flex h-5 items-center overflow-hidden rounded-md border border-indigo-300 bg-indigo-50 px-1.5 text-[10px] font-semibold whitespace-nowrap text-indigo-700"
                      style={{ left: x(s) + 1, width: w - 2 }}
                    >
                      {w >= LABEL_MIN_PX && formatRange(s, e)}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
    </div>
  );
}

export default TimelineDayBlock;
