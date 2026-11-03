import GridHeader from "./GridHeader";
import TimeColumn from "./TimeColumn";
import DayColumn from "./DayColumn";

const isSlotInDay = (day) => (slot) =>
  slot.dateStr ? slot.dateStr === day.dateStr : slot.dayIndex === day.dayIndex;

/**
 * GridScrollArea - Một khung cuộn DUY NHẤT cho cả 2 chiều.
 * Header ngày (sticky top) và cột giờ (sticky left) nằm chung khung với lưới nên khi vuốt ngang
 * trên mobile cột giờ vẫn đứng yên, cuộn dọc thì header vẫn ở trên. Mobile: mỗi màn 3 ngày,
 * snap theo mép ngày; desktop (md+): đủ 7 ngày như cũ.
 */
function GridScrollArea({
  scrollRef,
  columnRefs,
  weekDays,
  hours,
  slots,
  draftSlots,
  dragPreview,
  activeSlotId,
  onStartDrag,
  onSlotClick,
}) {
  return (
    <div
      ref={scrollRef}
      className="calendar-scrollbar relative mb-2 min-h-0 flex-1 snap-x snap-mandatory scroll-pl-12 overflow-auto overscroll-x-contain md:snap-none md:scroll-pl-0"
    >
      <div className="relative w-[calc(48px+(100%-48px)*7/3)] md:w-auto md:min-w-[840px]">
        <GridHeader weekDays={weekDays} />

        <div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] md:grid-cols-[70px_repeat(7,minmax(0,1fr))]">
          <TimeColumn hours={hours} />

          {weekDays.map((day, idx) => {
            const inDay = isSlotInDay(day);
            return (
              <DayColumn
                key={day.dateStr}
                ref={(el) => (columnRefs.current[idx] = el)}
                day={day}
                hours={hours}
                daySlots={[...slots.filter(inDay), ...draftSlots.filter(inDay)]}
                dragPreview={dragPreview}
                activeSlotId={activeSlotId}
                onMouseDown={(e) => onStartDrag(idx, e)}
                onSlotClick={onSlotClick}
                onResizeStart={() => {}}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default GridScrollArea;
