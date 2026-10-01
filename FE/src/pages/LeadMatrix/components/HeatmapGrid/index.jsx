import { useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import HeatmapHeader from "./HeatmapHeader";
import HeatmapTimeColumn from "./HeatmapTimeColumn";
import HeatmapCell from "./HeatmapCell";
import CellDetailPopover from "./CellDetailPopover";
import { useScrollRestoration, useScrollbarGutter } from "~/hooks";
import { useCellDetailPopover } from "../../hooks/useCellDetailPopover";
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
 * - useCellDetailPopover → định vị thông minh kề bên ô chọn, không che viền vàng
 */
function HeatmapGrid({
  weekDays,
  matrix,
  totalMembers,
  getCell,
  selectedCell: externalSelectedCell,
  onSelectCell,
}) {
  const { t } = useTranslation();
  const gridContainerRef = useRef(null);
  const scrollBodyRef = useRef(null);
  const scrollbarGutter = useScrollbarGutter(scrollBodyRef, 15);

  useScrollRestoration("leadmatrix_heatmap_grid", {
    ref: scrollBodyRef,
    defaultScrollTop: 8 * 64, // Mặc định cuộn tới 08:00
  });

  // State cho cell detail popover (hỗ trợ cả controlled & uncontrolled)
  const [internalSelectedCell, setInternalSelectedCell] = useState(null);
  const selectedCell =
    externalSelectedCell !== undefined
      ? externalSelectedCell
      : internalSelectedCell;
  const setSelectedCell = onSelectCell || setInternalSelectedCell;

  // Quản lý toạ độ và hiển thị thông minh của popover
  const { popoverRef, position } = useCellDetailPopover({
    selectedCell,
    containerRef: gridContainerRef,
    scrollRef: scrollBodyRef,
    onClose: () => setSelectedCell(null),
  });

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
    <div
      ref={gridContainerRef}
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_20px_45px_-12px_rgba(15,23,42,0.14),0_4px_16px_-2px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/5"
    >
      {/* Cell detail popover overlay */}
      {selectedCell && (
        <CellDetailPopover
          isOpen={!!selectedCell}
          cellData={selectedCell}
          blockStart={selectedCell.blockStart}
          dayName={selectedCell.dayName}
          position={position}
          popoverRef={popoverRef}
          onClose={() => setSelectedCell(null)}
        />
      )}

      {/* Khung cuộn ngang nếu màn hình nhỏ */}
      <div className="flex min-h-0 flex-1 flex-col overflow-x-auto">
        <div className="flex min-h-0 min-w-[740px] flex-1 flex-col">
          {/* Header 7 ngày - cố định trên */}
          <HeatmapHeader weekDays={weekDays} gutterWidth={scrollbarGutter} />

          {/* Vùng lưới cuộn dọc */}
          <div
            ref={scrollBodyRef}
            className="calendar-scrollbar relative mb-2 min-h-0 flex-1 overflow-y-scroll"
          >
            <div className="flex">
              {/* Cột mốc giờ bên trái */}
              <HeatmapTimeColumn blocks={blocks} />

              {/* 7 cột ngày heatmap */}
              <div className="grid flex-1 grid-cols-7">
                {weekDays.map((day) => (
                  <div key={day.dateStr} className="flex flex-col">
                    {blocks.map((blockStart) => {
                      const cell = getCell(day.dayIndex, blockStart);
                      return (
                        <HeatmapCell
                          key={`${day.dayIndex}-${blockStart}`}
                          dayIndex={day.dayIndex}
                          blockStart={blockStart}
                          count={cell.count}
                          totalMembers={totalMembers}
                          percent={cell.percent}
                          isHighlighted={
                            selectedCell?.dayIndex === day.dayIndex &&
                            selectedCell?.blockStart === blockStart
                          }
                          onClick={() =>
                            handleCellClick(
                              day.dayIndex,
                              blockStart,
                              day.dayName,
                            )
                          }
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
      <div className="flex items-center justify-center gap-3.5 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[11px] font-medium text-slate-500">
        <span className="font-semibold text-slate-600">
          {t("leadMatrix.legendLabel")}
        </span>
        <div className="flex items-center gap-1.5">
          <div className="h-3.5 w-5 rounded-md border border-slate-200 bg-white shadow-2xs" />
          <span>0%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3.5 w-5 rounded-md border border-indigo-200/60 bg-indigo-50 shadow-2xs" />
          <span>25%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3.5 w-5 rounded-md border border-indigo-300/70 bg-indigo-100 shadow-2xs" />
          <span>50%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3.5 w-5 rounded-md border border-indigo-500/50 bg-indigo-400 shadow-xs" />
          <span>75%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="ring-1.5 h-3.5 w-5 rounded-md bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-xs ring-indigo-400/80" />
          <span className="font-semibold text-indigo-700">100%</span>
        </div>
      </div>
    </div>
  );
}

export default HeatmapGrid;
