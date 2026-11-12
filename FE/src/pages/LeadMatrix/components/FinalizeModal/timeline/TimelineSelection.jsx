import { formatSpan } from "~/utils/finalizeTimeline";

/** Khung đang chọn trên thanh tổng: viền đậm, 2 tay nắm kéo để chỉnh, nhãn giờ ngay dưới (đổi theo lúc kéo). */
function TimelineSelection({ sel, x, drag }) {
  const left = x(sel.start);
  const right = x(sel.end);
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-2 h-7 rounded-md border-2 border-indigo-950"
        style={{ left, width: right - left }}
      />
      {["start", "end"].map((edge) => (
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
      <span
        className="pointer-events-none absolute top-[34px] z-10 -translate-x-1/2 rounded-full bg-indigo-600 px-2 py-px text-[10px] font-bold whitespace-nowrap text-white shadow-sm"
        style={{ left: (left + right) / 2 }}
      >
        {formatSpan(sel.start, sel.end)}
      </span>
    </>
  );
}

export default TimelineSelection;
