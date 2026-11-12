import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "~/lib/utils";
import { useHorizontalScroll } from "~/hooks";
import { formatMinutes } from "~/utils/finalizeCandidates";
import { buildTimelineDays, presentMemberIds, timelineRange } from "~/utils/finalizeTimeline";
import TimelineDayLabels from "./TimelineDayLabels";
import TimelineDayTrack from "./TimelineDayTrack";

const isCompact = () => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;
const busiestDate = (days) => {
  let best = days[0];
  let bestCount = -1;
  for (const day of days) {
    const peak = Math.max(...day.segments.map((s) => s.count));
    if (peak > bestCount) [best, bestCount] = [day, peak];
  }
  return best?.date;
};
const LEGEND = ["bg-indigo-100", "bg-indigo-200", "bg-indigo-400", "bg-indigo-500", "bg-indigo-600"];

/**
 * FinalizeTimeline - Chọn khung giờ chốt kiểu Timeline của Jira: cột trái là ngày / thành viên, bên phải là trục giờ chung.
 * Mỗi ngày có thanh tổng (đậm nhạt theo số người rảnh); mở ra thấy giờ rảnh của từng người.
 * Chỉ mở sẵn ngày đang chọn (hoặc ngày đầu tiên) để nhóm đông vẫn gọn; trục cuộn ngang, tự cuộn tới khung đang chọn.
 */
function FinalizeTimeline({ cells, members, selection, onSelect }) {
  const { t } = useTranslation();
  const [compact] = useState(isCompact);
  const pxPerHour = compact ? 44 : 56;
  const [mode, setMode] = useState("free");

  const days = useMemo(() => buildTimelineDays(cells, members), [cells, members]);
  const total = days[0]?.rows.length ?? 0;
  const range = useMemo(() => timelineRange(days, mode), [days, mode]);
  const cellKeys = useMemo(() => new Set(cells.map((c) => `${c.date}|${c.start}`)), [cells]);
  const present = useMemo(() => presentMemberIds(cells, selection), [cells, selection]);
  const width = ((range.end - range.start) / 60) * pxPerHour;
  const x = useCallback((m) => ((m - range.start) / 60) * pxPerHour, [range.start, pxPerHour]);

  // Mở sẵn ngày đang chọn, hoặc ngày có lúc đông người nhất
  const [openDates, setOpenDates] = useState(() => new Set([selection?.date ?? busiestDate(days)]));
  const isOpen = (date) => openDates.has(date) || selection?.date === date;
  const toggle = (date) =>
    setOpenDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });

  const { attach, atStart, atEnd } = useHorizontalScroll();
  const scrollRef = useRef(null);
  const setScrollEl = useCallback(
    (el) => {
      scrollRef.current = el;
      attach(el);
    },
    [attach]
  );
  const fade = `linear-gradient(to right, ${atStart ? "black" : "transparent"}, black 20px, black calc(100% - 20px), ${atEnd ? "black" : "transparent"})`;

  // Tự cuộn tới khung đang chọn khi nó nằm ngoài vùng đang thấy (vd bấm một gợi ý), hoặc lúc mở tới lúc đông người
  // nhất của ngày đang mở. Đang kéo chọn trong vùng nhìn thấy thì không cuộn (tránh lệch giờ dưới con trỏ).
  const openDay = days.find((d) => isOpen(d.date));
  const focusStart = selection?.start ?? openDay?.segments.reduce((a, b) => (b.count > a.count ? b : a)).start;
  const focusEnd = selection?.end ?? focusStart;
  useEffect(() => {
    const el = scrollRef.current;
    if (focusStart == null || !el) return;
    const visible = x(focusStart) >= el.scrollLeft && x(focusEnd) <= el.scrollLeft + el.clientWidth;
    if (!visible) el.scrollTo({ left: Math.max(0, x(focusStart) - pxPerHour), behavior: "smooth" });
  }, [focusStart, focusEnd, x, pxPerHour]);

  const hours = [];
  for (let m = range.start; m <= range.end; m += 60) hours.push(m);

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-600">{t("finalize.timelineTitle")}</p>
        <div className="flex rounded-lg bg-slate-100 p-0.5" role="group">
          {["free", "full"].map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={mode === key}
              onClick={() => setMode(key)}
              className={cn(
                "cursor-pointer rounded-md px-2 py-1 text-[11px] font-semibold whitespace-nowrap transition-colors",
                mode === key ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {t(key === "free" ? "finalize.zoomFree" : "finalize.zoomFull")}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-0.5 text-[11px] text-slate-400">{t(compact ? "finalize.timelineHintTouch" : "finalize.timelineHint")}</p>

      <div className="mt-2 flex max-h-[45vh] overflow-y-auto rounded-xl border border-slate-200">
        <div className="w-28 shrink-0 border-r border-slate-200 bg-white sm:w-44">
          <div className="sticky top-0 z-20 flex h-8 items-center truncate border-b border-slate-200 bg-slate-50 px-2 text-[10px] font-bold tracking-wider whitespace-nowrap text-slate-400 uppercase sm:px-3">
            <span className="sm:hidden">{t("finalize.timelineColumnShort")}</span>
            <span className="max-sm:hidden">{t("finalize.timelineColumn")}</span>
          </div>
          {days.map((day) => (
            <TimelineDayLabels
              key={day.date}
              day={day}
              open={isOpen(day.date)}
              onToggle={() => toggle(day.date)}
              present={present}
              hasSelection={selection?.date === day.date}
            />
          ))}
        </div>

        <div
          ref={setScrollEl}
          style={{ maskImage: fade, WebkitMaskImage: fade }}
          className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:thin]"
        >
          <div className="relative" style={{ width }}>
            <div className="pointer-events-none absolute inset-0">
              {hours.map((m) => (
                <div key={m} className="absolute inset-y-0 border-l border-slate-100" style={{ left: x(m) }} />
              ))}
            </div>
            <div className="sticky top-0 z-20 h-8 border-b border-slate-200 bg-slate-50">
              {hours.slice(0, -1).map((m) => (
                <span key={m} className="absolute top-2 pl-1 text-[10px] font-semibold text-slate-400" style={{ left: x(m) }}>
                  {formatMinutes(m)}
                </span>
              ))}
            </div>
            {days.map((day) => (
              <TimelineDayTrack
                key={day.date}
                day={day}
                open={isOpen(day.date)}
                total={total}
                width={width}
                x={x}
                cellKeys={cellKeys}
                range={range}
                pxPerHour={pxPerHour}
                selection={selection}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-500">
        {t("finalize.legendFew")}
        {LEGEND.map((c) => (
          <i key={c} className={cn("h-2.5 w-4 rounded-sm", c)} />
        ))}
        {t("finalize.legendAll", { count: total })}
      </div>
    </div>
  );
}

export default FinalizeTimeline;
