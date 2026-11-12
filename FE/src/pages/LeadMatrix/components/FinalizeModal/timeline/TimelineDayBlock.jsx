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
const COUNT_MIN_PX = 18;
// Ô tên ghim bên trái (như cột đầu Excel), nền che phần giờ chạy bên dưới; viền dưới đặt trên ô (không trên dòng)
// để dải chọn không lọt qua khe viền khi cuộn ngang
const STICKY_CELL = "sticky left-0 z-20 shrink-0 border-r border-b border-r-slate-200 border-b-slate-100";
const TRACK = "relative shrink-0 border-b border-slate-100";

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

/** Bo góc đầu/cuối mỗi khoảng liền nhau (các đoạn sát nhau ghép thành một thanh liền). */
const roundClass = (segments, i) =>
  cn(
    segments[i - 1]?.end !== segments[i].start && "rounded-l-md",
    segments[i + 1]?.start !== segments[i].end && "rounded-r-md"
  );

/** Thanh tổng của ngày: các đoạn đậm nhạt theo số người ([data-select] = chạm/kéo để chọn), khung đang chọn + 2 tay nắm. */
function DayBar({ day, total, axis, sel, drag }) {
  const { x, width } = axis;
  return (
    <div {...drag.bar} className={cn(TRACK, "touch-pan-x select-none bg-slate-50/60")} style={{ width }}>
      {day.segments.map((seg, i) => {
        const w = x(seg.end) - x(seg.start);
        return (
          <div
            key={seg.start}
            data-select
            title={`${formatRange(seg.start, seg.end)} · ${seg.count}/${total}`}
            className={cn(
              "absolute top-2.5 flex h-6 cursor-pointer items-center justify-center text-[11px] font-bold",
              LEVEL_CLASS[heatLevel(seg.count, total)],
              roundClass(day.segments, i)
            )}
            style={{ left: x(seg.start), width: w }}
          >
            {w >= COUNT_MIN_PX && seg.count}
          </div>
        );
      })}

      {sel && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-2 h-7 rounded-md border-2 border-indigo-950"
          style={{ left: x(sel.start), width: x(sel.end) - x(sel.start) }}
        />
      )}
      {sel &&
        ["start", "end"].map((edge) => (
          <div
            key={edge}
            data-select
            role="slider"
            aria-label={edge === "start" ? "Giờ bắt đầu" : "Giờ kết thúc"}
            aria-valuenow={sel[edge]}
            {...drag.handle(edge)}
            className="absolute top-1/2 z-10 flex h-9 w-6 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center"
            style={{ left: x(sel[edge]) }}
          >
            <span className="h-6 w-2 rounded-full border-2 border-indigo-600 bg-white shadow-sm" />
          </div>
        ))}
    </div>
  );
}

/** Một thành viên: ô tên (✓ có mặt / mờ + "vắng" khi đang chọn khung trong ngày) + các thanh giờ rảnh của họ. */
function MemberRow({ row, axis, hasSelection, isPresent }) {
  const { t } = useTranslation();
  const { x, width, labelWidth } = axis;
  const isAbsent = hasSelection && !isPresent;

  return (
    <div className="flex h-8">
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
        {isPresent && <Check size={14} strokeWidth={3} className="shrink-0 text-emerald-600" aria-label={t("finalize.present")} />}
        {isAbsent && <span className="shrink-0 text-[10px] font-semibold text-amber-700">{t("finalize.absent")}</span>}
      </div>
      <div className={TRACK} style={{ width }}>
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
}

/**
 * Một ngày trên timeline: mỗi dòng gồm ô tên (ghim trái) và phần giờ đi liền nhau, nên không bao giờ lệch dòng.
 * Bấm ô ngày để mở / thu gọn danh sách thành viên. Khung đang chọn trong ngày: dải mờ phủ xuống các dòng thành viên.
 */
function TimelineDayBlock({ day, open, onToggle, total, axis, cellKeys, selection, present, onSelect }) {
  const drag = useTimelineDrag({ day, cellKeys, axis, selection, onSelect });
  const sel = selection?.date === day.date ? selection : null;
  const Chevron = open ? ChevronDown : ChevronRight;
  const { labelWidth, x } = axis;

  return (
    <div className="relative">
      {sel && open && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-1 rounded-md border-x-2 border-dashed border-indigo-500 bg-indigo-500/10"
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
            <span className="block truncate sm:hidden">{shortDateLabel(day.date)}</span>
            <span className="block truncate max-sm:hidden">{formatDateLabel(day.date)}</span>
            {/* Các khoảng có người rảnh: luôn thấy dù phần đó của trục đang nằm ngoài màn hình */}
            <span className="block truncate text-[10px] font-medium text-slate-400">{spanLabel(day.segments)}</span>
          </span>
        </button>
        <DayBar day={day} total={total} axis={axis} sel={sel} drag={drag} />
      </div>

      {open &&
        day.rows.map((row) => (
          <MemberRow
            key={row.memberId}
            row={row}
            axis={axis}
            hasSelection={Boolean(sel)}
            isPresent={Boolean(sel) && present.has(row.memberId)}
          />
        ))}
    </div>
  );
}

export default TimelineDayBlock;
