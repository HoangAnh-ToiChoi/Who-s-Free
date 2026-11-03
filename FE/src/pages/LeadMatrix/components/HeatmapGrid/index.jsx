import { useRef, useState, useMemo, useEffect } from "react";
import HeatmapHeader from "./HeatmapHeader";
import HeatmapTimeColumn from "./HeatmapTimeColumn";
import HeatmapCell from "./HeatmapCell";
import CellDetailPopover from "./CellDetailPopover";
import HeatmapLegend from "./HeatmapLegend";
import MobileDayStrip from "~/components/MobileDayStrip";
import { useScrollRestoration, useDayPager } from "~/hooks";
import { useCellDetailPopover } from "../../hooks/useCellDetailPopover";

/**
 * HeatmapGrid - Lưới Heatmap mật độ rảnh của cả nhóm
 *
 * Cấu trúc tương tự AvailabilityGrid nhưng thay vì kéo thả slot,
 * hiển thị ô màu theo tỷ lệ phần trăm quorum.
 *
 * Tuân thủ:
 * - Một khung cuộn 2 chiều: header sticky top, cột giờ sticky left → mobile vuốt 3/7 ngày vẫn thấy giờ
 * - useScrollRestoration → phục hồi vị trí cuộn khi reload
 * - useCellDetailPopover → định vị thông minh kề bên ô chọn, không che viền vàng
 */
function HeatmapGrid({
  weekDays,
  totalMembers,
  getCell,
  selectedCell: externalSelectedCell,
  onSelectCell,
}) {
  const gridContainerRef = useRef(null);
  const scrollBodyRef = useRef(null);
  const { firstVisible, scrollToDay } = useDayPager(scrollBodyRef, { timeColumnWidth: 48 });
  useEffect(() => {
    const todayIndex = weekDays.findIndex((d) => d.isToday);
    scrollToDay(Math.min(Math.max(todayIndex, 0), 4), "auto");
  }, [weekDays, scrollToDay]);

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

  const markedDates = useMemo(
    () =>
      new Set(
        weekDays
          .filter((day) => blocks.some((b) => getCell(day.dayIndex, b).count > 0))
          .map((day) => day.dateStr)
      ),
    [weekDays, blocks, getCell]
  );

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

      <div className="border-b border-slate-100 p-2 md:hidden">
        <MobileDayStrip
          weekDays={weekDays}
          firstVisible={firstVisible}
          markedDates={markedDates}
          onSelectDay={scrollToDay}
        />
      </div>

      <div
        ref={scrollBodyRef}
        className="calendar-scrollbar relative mb-2 min-h-0 flex-1 snap-x snap-mandatory scroll-pl-12 overflow-auto overscroll-x-contain md:snap-none md:scroll-pl-0"
      >
        <div className="relative w-[calc(48px+(100%-48px)*7/3)] md:w-auto md:min-w-[740px]">
          <HeatmapHeader weekDays={weekDays} />

          <div className="flex">
            <HeatmapTimeColumn blocks={blocks} />

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

      <HeatmapLegend />
    </div>
  );
}

export default HeatmapGrid;
