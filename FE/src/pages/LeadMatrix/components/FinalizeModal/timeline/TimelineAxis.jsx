import { useTranslation } from "react-i18next";
import { formatMinutes } from "~/utils/finalizeCandidates";

/**
 * Đường kẻ mỗi giờ (phủ cả bảng) + hàng giờ trên cùng. Ô đầu hàng ghim trái như cột tên.
 * headerRef gắn vào hàng giờ: lăn chuột trên hàng này = cuộn ngang (xem useTimelineScroll).
 */
function TimelineAxis({ hours, labelWidth, width, x, headerRef }) {
  const { t } = useTranslation();

  return (
    <>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {hours.map((m) => (
          <div key={m} className="absolute inset-y-0 border-l border-slate-100" style={{ left: labelWidth + x(m) }} />
        ))}
      </div>

      <div ref={headerRef} className="relative flex h-8 border-b border-slate-200 bg-slate-50">
        <div
          style={{ width: labelWidth }}
          className="sticky left-0 z-20 flex shrink-0 items-center truncate border-r border-slate-200 bg-slate-50 px-2 text-[10px] font-bold tracking-wider whitespace-nowrap text-slate-400 uppercase sm:px-3"
        >
          <span className="sm:hidden">{t("finalize.timelineColumnShort")}</span>
          <span className="max-sm:hidden">{t("finalize.timelineColumn")}</span>
        </div>
        <div className="relative shrink-0" style={{ width }}>
          {hours.slice(0, -1).map((m) => (
            <span key={m} className="absolute top-2 pl-1 text-[10px] font-semibold text-slate-400" style={{ left: x(m) }}>
              {formatMinutes(m)}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

export default TimelineAxis;
