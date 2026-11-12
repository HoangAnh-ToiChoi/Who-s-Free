import { memo } from "react";
import { cn } from "~/lib/utils";
import { formatRange } from "~/utils/finalizeCandidates";
import { heatLevel } from "~/utils/finalizeTimeline";
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

/**
 * Phần bên phải của một ngày: thanh tổng (đậm nhạt theo số người, kéo/chạm để chọn) + mỗi thành viên một hàng
 * với các thanh giờ rảnh của họ. Khung đang chọn: viền đậm + 2 tay nắm trên thanh tổng, dải mờ phủ xuống các hàng.
 */
function TimelineDayTrack({ day, open, total, width, x, cellKeys, range, pxPerHour, selection, onSelect }) {
  const drag = useTimelineDrag({ day, cellKeys, range, pxPerHour, selection, onSelect });
  const sel = selection?.date === day.date ? selection : null;
  const isEdge = (i, side) => {
    const other = day.segments[i + (side === "left" ? -1 : 1)];
    return !other || (side === "left" ? other.end !== day.segments[i].start : other.start !== day.segments[i].end);
  };

  return (
    <div className="relative" style={{ width }}>
      {sel && open && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-1 rounded-md border-x-2 border-dashed border-indigo-500 bg-indigo-500/10"
          style={{ left: x(sel.start), width: x(sel.end) - x(sel.start) }}
        />
      )}

      <div
        {...drag.bar}
        className="relative h-10 cursor-pointer touch-pan-x select-none border-b border-slate-100 bg-slate-50/80"
      >
        {day.segments.map((seg, i) => {
          const w = x(seg.end) - x(seg.start);
          return (
            <div
              key={seg.start}
              title={`${formatRange(seg.start, seg.end)} · ${seg.count}/${total}`}
              className={cn(
                "absolute top-2 flex h-6 items-center justify-center text-[11px] font-bold",
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
              className="pointer-events-none absolute top-1.5 h-7 rounded-md border-2 border-indigo-950"
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

      {open &&
        day.rows.map((row) => (
          <div key={row.memberId} className="relative h-8 border-b border-slate-100">
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
        ))}
    </div>
  );
}

export default memo(TimelineDayTrack);
