import { useMemo } from "react";
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
 * Mọi prop của DayColumn đều giữ ổn định giữa các lần render (DayColumn là memo): khi đang kéo,
 * chỉ cột nằm trong vùng kéo nhận dragPreview mới → các cột khác không vẽ lại.
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
  touch,
  onSlotClick,
}) {
  const slotsByDay = useMemo(
    () => weekDays.map((day) => [...slots.filter(isSlotInDay(day)), ...draftSlots.filter(isSlotInDay(day))]),
    [weekDays, slots, draftSlots]
  );
  const setColumnRef = useMemo(
    () => weekDays.map((_, idx) => (el) => (columnRefs.current[idx] = el)),
    [weekDays, columnRefs]
  );

  return (
    <div
      ref={scrollRef}
      className="calendar-scrollbar relative isolate mb-2 min-h-0 flex-1 snap-x snap-mandatory scroll-pl-12 overflow-auto overscroll-x-contain md:snap-none md:scroll-pl-0"
    >
      <div className="relative w-[calc(48px+(100%-48px)*7/3)] md:w-auto md:min-w-[840px]">
        <GridHeader weekDays={weekDays} />

        <div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] md:grid-cols-[70px_repeat(7,minmax(0,1fr))]">
          <TimeColumn hours={hours} />

          {weekDays.map((day, idx) => {
            const inDrag = dragPreview && idx >= dragPreview.startDayIndex && idx <= dragPreview.endDayIndex;
            return (
              <DayColumn
                key={day.dateStr}
                ref={setColumnRef[idx]}
                index={idx}
                day={day}
                hours={hours}
                daySlots={slotsByDay[idx]}
                dragPreview={inDrag ? dragPreview : null}
                activeSlotId={activeSlotId}
                onStartDrag={onStartDrag}
                touch={touch}
                onSlotClick={onSlotClick}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default GridScrollArea;
