import { useRef } from "react";
import GridToolbar from "../GridToolbar";
import GridHeader from "./GridHeader";
import TimeColumn from "./TimeColumn";
import DayColumn from "./DayColumn";
import SlotPopover from "../SlotPopover";

import { START_HOUR, END_HOUR, HOUR_HEIGHT } from "../../helper/timeUtils";
import { useWeekNavigation } from "../../hooks/useWeekNavigation";
import { useAvailabilitySlots } from "../../hooks/useAvailabilitySlots";
import { useGridDrag } from "../../hooks/useGridDrag";
import { useSlotPopover } from "../../hooks/useSlotPopover";
import { useScrollRestoration, useScrollbarGutter } from "~/hooks";

const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

/**
 * AvailabilityGrid - Trọng tâm cốt lõi (Core) của dự án
 * 
 * Đạt chuẩn trải nghiệm thực tế như Google Calendar:
 * - Điều hướng tuần (Previous / Next / Today) với ngày động
 * - Khung cuộn nội bộ (Internal Scroll) - Thanh cuộn nằm DƯỚI Header ngày tháng
 * - Header và lưới giờ đồng bộ thẳng hàng 100% qua cơ chế Scrollbar Gutter bù trừ động
 * - Kéo thả hiển thị vùng chọn theo thời gian thực (Real-time Drag Feedback)
 * - Tự động lưu và phục hồi vị trí cuộn khi F5 (useScrollRestoration)
 * - Khối lịch nổi 3D đa tầng đổ bóng chân thực
 * - Đồng bộ 100% bảng màu tím Indigo chuẩn thương hiệu Who's Free
 */
function AvailabilityGrid() {
  const containerRef = useRef(null);
  const scrollBodyRef = useRef(null);
  const columnRefs = useRef([]);

  // Tự động đo độ rộng chính xác của thanh cuộn trên mọi hệ điều hành để Header thẳng hàng 100%
  const scrollbarGutter = useScrollbarGutter(scrollBodyRef, 15);

  // Tự động lưu và phục hồi vị trí cuộn khi F5 (Mặc định cuộn tới 08:00 nếu chưa có dữ liệu lưu)
  useScrollRestoration("matrix_availability_grid", {
    ref: scrollBodyRef,
    defaultScrollTop: 8 * HOUR_HEIGHT,
  });

  // 1. Hook quản lý ngày tháng & tuần
  const {
    weekDays,
    weekLabel,
    goToPrevWeek,
    goToNextWeek,
    goToToday,
  } = useWeekNavigation();

  // 2. Hook quản lý danh sách slot rảnh & thống kê
  const {
    slots,
    stats,
    saveSlot,
    deleteSlot,
    clearAllSlots,
    resizeSlot,
  } = useAvailabilitySlots();

  // 3. Hook quản lý popover neo có mũi tên
  const {
    popover,
    openPopover,
    closePopover,
  } = useSlotPopover();

  // 4. Hook quản lý cơ chế kéo thả chuột thời gian thực
  const {
    dragPreview,
    startDrag,
  } = useGridDrag({
    containerRef,
    columnRefs,
    onDragComplete: ({ dayIndex, startMinutes, endMinutes, anchorRect, containerRect }) => {
      const selectedDay = weekDays[dayIndex];
      const newDraftSlot = {
        id: `slot-${Date.now()}`,
        dayIndex,
        dateStr: selectedDay?.dateStr,
        startMinutes,
        endMinutes,
        label: "Available",
        note: "",
      };

      openPopover({
        mode: "new",
        slotData: newDraftSlot,
        anchorRect,
        containerRect,
      });
    },
  });

  // Khi click vào một slot đã có để mở popover chỉnh sửa
  const handleSlotClick = (slot, e) => {
    e.stopPropagation();
    const slotCardEl = e.currentTarget;
    const containerEl = containerRef.current;
    if (!slotCardEl || !containerEl) return;

    openPopover({
      mode: "edit",
      slotData: slot,
      clickY: e.clientY,
      anchorRect: slotCardEl.getBoundingClientRect(),
      containerRect: containerEl.getBoundingClientRect(),
    });
  };

  return (
    <div className="flex flex-col h-full gap-2.5 flex-1 min-h-0">
      {/* 1. Thanh công cụ tuần (Google Calendar Navigation Toolbar) */}
      <GridToolbar
        weekLabel={weekLabel}
        stats={stats}
        onPrevWeek={goToPrevWeek}
        onNextWeek={goToNextWeek}
        onToday={goToToday}
        onClearAll={clearAllSlots}
      />

      {/* 2. Khung lưới lịch (Viewport Container): Khối vật thể nổi 3D đa tầng đổ bóng chân thực */}
      <div
        ref={containerRef}
        className="relative flex flex-col flex-1 rounded-2xl border border-slate-200/90 bg-white shadow-[0_20px_45px_-12px_rgba(15,23,42,0.14),0_4px_16px_-2px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/5 overflow-hidden min-h-0"
      >
        {/* Popover nhỏ neo có mũi tên chỉ vào slot (Ảnh 1 & Ảnh 2) */}
        <SlotPopover
          isOpen={popover.isOpen}
          mode={popover.mode}
          slotData={popover.slotData}
          anchorPos={popover.anchorPos}
          onSave={(slotData) => {
            saveSlot(slotData);
            closePopover();
          }}
          onDelete={(slotId) => {
            deleteSlot(slotId);
            closePopover();
          }}
          onClose={closePopover}
        />

        {/* Khung cuộn ngang nếu màn hình nhỏ */}
        <div className="flex flex-col flex-1 overflow-x-auto min-h-0">
          <div className="min-w-[840px] flex flex-col flex-1 min-h-0">
            {/* 1. Header 7 ngày nằm trên cố định - KHÔNG bị thanh cuộn che hoặc đè */}
            <GridHeader weekDays={weekDays} gutterWidth={scrollbarGutter} />

            {/* 2. Vùng lưới giờ cuộn dọc nội bộ - Thanh cuộn bắt đầu từ DƯỚI Header và chừa đệm đáy mb-2 */}
            <div ref={scrollBodyRef} className="calendar-scrollbar flex-1 overflow-y-scroll min-h-0 relative mb-2">
              <div className="grid grid-cols-[70px_repeat(7,1fr)] relative">
                {/* Cột mốc giờ bên trái */}
                <TimeColumn hours={HOURS} />

                {/* 7 cột ngày */}
                {weekDays.map((day, idx) => {
                  const daySlots = slots.filter(
                    (s) => s.dayIndex === day.dayIndex || s.dateStr === day.dateStr
                  );

                  return (
                    <DayColumn
                      key={day.dateStr}
                      ref={(el) => (columnRefs.current[idx] = el)}
                      day={day}
                      hours={HOURS}
                      daySlots={daySlots}
                      dragPreview={dragPreview}
                      activeSlotId={popover.isOpen ? popover.slotData?.id : null}
                      onMouseDown={(e) => startDrag(idx, e)}
                      onSlotClick={handleSlotClick}
                      onResizeStart={(slotId, edge, e) => {
                        // Hook resize slot
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AvailabilityGrid;
