import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "~/lib/utils";
import { isNarrowScreen } from "~/utils/viewport";
import { hasResponded } from "~/utils/members";
import { buildTimelineDays, presentMemberIds, timelineRange } from "~/utils/finalizeTimeline";
import TimelineToolbar from "./TimelineToolbar";
import TimelineAxis from "./TimelineAxis";
import TimelineDayBlock from "./TimelineDayBlock";
import { useTimelineScroll } from "./useTimelineScroll";

const LEGEND = ["bg-indigo-100", "bg-indigo-200", "bg-indigo-400", "bg-indigo-500", "bg-indigo-600"];
const peakOf = (day) => day.segments.reduce((a, b) => (b.count > a.count ? b : a));
const busiestDate = (days) => days.reduce((a, b) => (peakOf(b).count > peakOf(a).count ? b : a), days[0])?.date;

/**
 * FinalizeTimeline - Chọn khung giờ chốt kiểu Timeline của Jira: cột ngày / thành viên ghim trái, trục giờ chung bên phải.
 * Mỗi ngày có thanh tổng (đậm nhạt theo số người); mở ra thấy giờ rảnh từng người. Chỉ mở sẵn ngày đang chọn
 * hoặc ngày đông người nhất. Một khối cuộn ngang duy nhất, modal là nơi duy nhất cuộn dọc (xem useTimelineScroll).
 */
function FinalizeTimeline({ cells, members, selection, onSelect }) {
  const { t } = useTranslation();
  const [compact] = useState(isNarrowScreen);
  const labelWidth = compact ? 112 : 176;
  const [mode, setMode] = useState("free");

  const days = useMemo(() => buildTimelineDays(cells, members), [cells, members]);
  const total = useMemo(() => members.filter(hasResponded).length, [members]);
  const range = useMemo(() => timelineRange(days, mode), [days, mode]);
  const { setScrollEl, scrollEl, headerRef, pxPerHour, canScroll, atStart, atEnd, scrollByStep, isPanning, pan } =
    useTimelineScroll({ hours: (range.end - range.start) / 60, labelWidth, minPx: compact ? 44 : 40 });

  // Thước đo dùng chung cho trục giờ và mọi ngày: x(phút) = vị trí trong phần giờ
  const axis = useMemo(() => {
    const x = (m) => ((m - range.start) / 60) * pxPerHour;
    return { range, pxPerHour, labelWidth, width: x(range.end), x };
  }, [range, pxPerHour, labelWidth]);
  const hours = useMemo(() => {
    const list = [];
    for (let m = range.start; m <= range.end; m += 60) list.push(m);
    return list;
  }, [range]);
  const cellKeys = useMemo(() => new Set(cells.map((c) => `${c.date}|${c.start}`)), [cells]);
  const present = useMemo(() => presentMemberIds(cells, selection), [cells, selection]);

  // Mỗi lúc chỉ mở MỘT ngày: ngày đang chọn giờ (chọn sang ngày khác thì tự chuyển), hoặc ngày vừa bấm mở
  const [openDate, setOpenDate] = useState(() => selection?.date ?? busiestDate(days));
  const [seenSelDate, setSeenSelDate] = useState(selection?.date);
  if (selection?.date !== seenSelDate) {
    setSeenSelDate(selection?.date);
    if (selection) setOpenDate(selection.date);
  }
  const isOpen = (date) => date === openDate;
  const toggle = (date) => setOpenDate((prev) => (prev === date ? null : date));

  // Tự cuộn tới khung đang chọn (vd bấm gợi ý) hoặc lúc đông người nhất của ngày đang mở — chỉ khi nó nằm ngoài
  // phần đang thấy (bề rộng khung trừ cột tên ghim), để đang kéo chọn thì bảng không trượt dưới con trỏ.
  const openDay = days.find((d) => isOpen(d.date));
  const focusStart = selection?.start ?? (openDay && peakOf(openDay).start);
  const focusEnd = selection?.end ?? focusStart;
  // Lần đầu (vừa mở bảng) nhảy thẳng tới chỗ cần xem; các lần sau mới lướt êm (tránh bảng tự trượt ngay khi hiện)
  const positionedRef = useRef(false);
  useEffect(() => {
    if (focusStart == null || !scrollEl) return;
    const { x } = axis;
    const left = scrollEl.scrollLeft;
    if (x(focusStart) < left || x(focusEnd) > left + scrollEl.clientWidth - labelWidth) {
      const behavior = positionedRef.current ? "smooth" : "auto";
      scrollEl.scrollTo({ left: Math.max(0, x(focusStart) - pxPerHour), behavior });
    }
    positionedRef.current = true;
  }, [focusStart, focusEnd, axis, pxPerHour, labelWidth, scrollEl]);

  return (
    <div>
      <TimelineToolbar
        canScroll={canScroll}
        atStart={atStart}
        atEnd={atEnd}
        onStep={scrollByStep}
        mode={mode}
        onModeChange={setMode}
      />
      <p className="mt-0.5 text-[11px] text-slate-400">{t(compact ? "finalize.timelineHintTouch" : "finalize.timelineHint")}</p>

      <div
        ref={setScrollEl}
        {...pan}
        className={cn(
          "mt-2 overflow-x-auto overflow-y-hidden rounded-xl border border-slate-200",
          canScroll && !compact && (isPanning ? "cursor-grabbing select-none" : "cursor-grab")
        )}
      >
        <div className="relative min-w-full" style={{ width: labelWidth + axis.width }}>
          <TimelineAxis hours={hours} labelWidth={labelWidth} width={axis.width} x={axis.x} headerRef={headerRef} />
          {days.map((day) => (
            <TimelineDayBlock
              key={day.date}
              day={day}
              open={isOpen(day.date)}
              onToggle={() => toggle(day.date)}
              total={total}
              axis={axis}
              cellKeys={cellKeys}
              selection={selection}
              present={present}
              onSelect={onSelect}
            />
          ))}
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
