import { useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import HeatmapHeader from "./HeatmapHeader";
import HeatmapTimeColumn from "./HeatmapTimeColumn";
import HeatmapCell from "./HeatmapCell";
import CellDetailPopover from "./CellDetailPopover";
import { useScrollRestoration, useScrollbarGutter } from "~/hooks";
import { START_HOUR, END_HOUR } from "~/utils/timeUtils";

/**
 * HeatmapGrid - Lưới Heatmap mật độ rảnh của cả nhóm
 *
 * Cấu trúc tương tự AvailabilityGrid nhưng thay vì kéo thả slot,
 * hiển thị ô màu theo tỷ lệ phần trăm quorum.
 *
 * Tuân thủ:
 * - .calendar-scrollbar + useScrollbarGutter → Header luôn thẳng hàng
 * - useScrollRestoration → phục hồi vị trí cuộn khi reload
 */
function HeatmapGrid({ weekDays, matrix, totalMembers, getCell }) {
  const { t } = useTranslation();
  const scrollBodyRef = useRef(null);
  const scrollbarGutter = useScrollbarGutter(scrollBodyRef, 15);

  useScrollRestoration("leadmatrix_heatmap_grid", {
    ref: scrollBodyRef,
    defaultScrollTop: 8 * 64, // Mặc định cuộn tới 08:00
  });

  // State cho cell detail popover
  const [selectedCell, setSelectedCell] = useState(null);

  // Tạo danh sách block 30 phút (chỉ hiện 06:00 - 22:00 cho gọn)
  const visibleStartHour = 6;
  const visibleEndHour = 22;
  const blocks = useMemo(() => {
    const result = [];
    for (let h = visibleStartHour; h <= visibleEndHour; h++) {
      result.push(h * 60);
      if (h < visibleEndHour) {
        result.push(h * 60 + 30);
      }
    }
    return result;
  }, []);

  const handleCellClick = (dayIndex, blockStart, dayName) => {
    const cell = getCell(dayIndex, blockStart);
    setSelectedCell({
      dayIndex,
      blockStart,
      dayName,
      ...cell,
      totalMembers,
    });
  };

  return (
    <div className="relative flex flex-col flex-1 rounded-2xl border border-slate-200/90 bg-white shadow-[0_20px_45px_-12px_rgba(15,23,42,0.14),0_4px_16px_-2px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/5 overflow-hidden min-h-0">
      {/* Cell detail popover overlay */}
      {selectedCell && (
        <CellDetailPopover
          isOpen={!!selectedCell}
          cellData={selectedCell}
          blockStart={selectedCell.blockStart}
          dayName={selectedCell.dayName}
          onClose={() => setSelectedCell(null)}
        />
      )}

      {/* Khung cuộn ngang nếu màn hình nhỏ */}
      <div className="flex flex-col flex-1 overflow-x-auto min-h-0">
        <div className="min-w-[740px] flex flex-col flex-1 min-h-0">
          {/* Header 7 ngày - cố định trên */}
          <HeatmapHeader weekDays={weekDays} gutterWidth={scrollbarGutter} />

          {/* Vùng lưới cuộn dọc */}
          <div
            ref={scrollBodyRef}
            className="calendar-scrollbar flex-1 overflow-y-scroll min-h-0 relative mb-2"
          >
            <div className="flex">
              {/* Cột mốc giờ bên trái */}
              <HeatmapTimeColumn blocks={blocks} />

              {/* 7 cột ngày heatmap */}
              <div className="flex-1 grid grid-cols-7">
                {weekDays.map((day) => (
                  <div key={day.dateStr} className="flex flex-col">
                    {blocks.map((blockStart) => {
                      const cell = getCell(day.dayIndex, blockStart);
                      return (
                        <HeatmapCell
                          key={`${day.dayIndex}-${blockStart}`}
                          count={cell.count}
                          totalMembers={totalMembers}
                          percent={cell.percent}
                          isHighlighted={
                            selectedCell?.dayIndex === day.dayIndex &&
                            selectedCell?.blockStart === blockStart
                          }
                          onClick={() => handleCellClick(day.dayIndex, blockStart, day.dayName)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap Legend */}
      <div className="flex items-center justify-center gap-3 py-2 px-4 border-t border-slate-100 bg-slate-50/50 text-[10px] font-medium text-slate-500">
        <span>{t("leadMatrix.legendLabel")}</span>
        <div className="flex items-center gap-1">
          <div className="w-5 h-4 rounded bg-slate-50 border border-slate-200" />
          <span>0%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-5 h-4 rounded bg-indigo-100" />
          <span>25%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-5 h-4 rounded bg-indigo-300" />
          <span>50%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-5 h-4 rounded bg-indigo-500" />
          <span>75%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-5 h-4 rounded bg-indigo-600 ring-2 ring-emerald-400 ring-inset" />
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}

export default HeatmapGrid;
