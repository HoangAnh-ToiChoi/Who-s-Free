import { useRef, useState, useMemo } from "react";
import { Clock } from "lucide-react";
import GridToolbar from "../GridToolbar";
import GridHeader from "./GridHeader";
import TimeColumn from "./TimeColumn";
import DayColumn from "./DayColumn";
import SlotPopover from "../SlotPopover";

import {
  START_HOUR,
  END_HOUR,
  HOUR_HEIGHT,
  minutesToTimeString,
  formatDuration,
} from "~/utils/timeUtils";
import { useAvailabilitySlots } from "../../hooks/useAvailabilitySlots";
import { useGridDrag } from "../../hooks/useGridDrag";
import { useSlotPopover } from "../../hooks/useSlotPopover";
import {
  useWeekNavigation,
  useScrollRestoration,
  useScrollbarGutter,
} from "~/hooks";

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
function AvailabilityGrid({ sessionId }) {
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
  } = useAvailabilitySlots({ sessionId });

  // Lọc các slot thuộc tuần hiện tại để hiển thị và tính toán va chạm chính xác
  const currentWeekSlots = useMemo(() => {
    return slots.filter((s) => {
      if (s.dateStr) {
        return weekDays.some((w) => w.dateStr === s.dateStr);
      }
      return true;
    });
  }, [slots, weekDays]);

  // Thống kê riêng cho tuần đang xem
  const weekStats = useMemo(() => {
    const totalMinutes = currentWeekSlots.reduce(
      (acc, s) => acc + Math.max(0, s.endMinutes - s.startMinutes),
      0
    );
    const totalHours = (totalMinutes / 60).toFixed(1);
    return {
      count: currentWeekSlots.length,
      totalHours: totalHours.endsWith(".0") ? parseInt(totalHours, 10) : totalHours,
    };
  }, [currentWeekSlots]);

  // 3. State quản lý các slot tạm thời (draft) khi người dùng vừa kéo chuột xong nhưng chưa bấm Áp dụng
  const [draftSlots, setDraftSlots] = useState([]);

  // Danh sách slot dùng để tính toán va chạm kéo thả của tuần hiện tại
  const visibleExistingSlots = useMemo(() => {
    return [...currentWeekSlots, ...draftSlots];
  }, [currentWeekSlots, draftSlots]);

  // 4. Hook quản lý popover tuỳ chỉnh slot (Chỉnh sửa giờ, note, xoá)
  const {
    popover,
    openPopover,
    closePopover,
  } = useSlotPopover();

  // 5. Hook quản lý cơ chế kéo thả chuột thời gian thực (hỗ trợ kéo 2 chiều & kéo chéo nhiều ngày)
  const {
    isDragging,
    dragPreview,
    startDrag,
  } = useGridDrag({
    containerRef,
    columnRefs,
    existingSlots: visibleExistingSlots,
    onDragComplete: ({
      dayIndices,
      dayIndex,
      startMinutes,
      endMinutes,
      anchorRect,
      containerRect,
    }) => {
      const selectedDay =
        weekDays.find((d) => d.dayIndex === dayIndex) ||
        weekDays[dayIndex] ||
        weekDays[0];

      if (dayIndices && dayIndices.length > 1) {
        const createdDrafts = dayIndices.map((dIdx) => {
          const dObj = weekDays.find((d) => d.dayIndex === dIdx);
          return {
            id: `draft-${Date.now()}-${dIdx}`,
            dayIndex: dIdx,
            dateStr: dObj?.dateStr,
            startMinutes,
            endMinutes,
            label: "Available",
            note: "",
          };
        });

        // Chỉ lưu vào draftSlots để hiển thị tạm trên lưới, KHÔNG LƯU vào DB khi chưa bấm Áp dụng
        setDraftSlots(createdDrafts);

        const activeCreatedSlot =
          createdDrafts.find((s) => s.dayIndex === dayIndex) ||
          createdDrafts[createdDrafts.length - 1];

        openPopover({
          mode: "new",
          slotData: {
            ...activeCreatedSlot,
            dayIndices,
            createdSlots: createdDrafts,
          },
          anchorRect,
          containerRect,
        });
      } else {
        const newDraft = {
          id: `draft-${Date.now()}`,
          dayIndex,
          dateStr: selectedDay?.dateStr,
          startMinutes,
          endMinutes,
          label: "Available",
          note: "",
        };

        // Chỉ lưu vào draftSlots để hiển thị tạm trên lưới
        setDraftSlots([newDraft]);

        openPopover({
          mode: "new",
          slotData: newDraft,
          anchorRect,
          containerRect,
        });
      }
    },
  });

  // Khi click vào một slot đã có để mở popover chỉnh sửa
  const handleSlotClick = (slot, e) => {
    e.stopPropagation();
    // Hủy bỏ draft chưa lưu nếu có
    setDraftSlots([]);

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
        stats={weekStats}
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
        {/* Popover nhỏ neo có mũi tên chỉ vào slot */}
        <SlotPopover
          isOpen={popover.isOpen}
          mode={popover.mode}
          slotData={popover.slotData}
          anchorPos={popover.anchorPos}
          onSave={(slotData) => {
            if (popover.mode === "new") {
              // Người dùng bấm Áp dụng: Lúc này MỚI chính thức lưu vào slots & DB
              if (draftSlots.length > 1) {
                const finalSlots = draftSlots.map((ds) => ({
                  ...ds,
                  id: `slot-${Date.now()}-${ds.dayIndex}`,
                  startMinutes: slotData.startMinutes,
                  endMinutes: slotData.endMinutes,
                  note: slotData.note || "",
                  label: slotData.label || "Available",
                }));
                saveSlot(finalSlots);
              } else {
                saveSlot({
                  ...slotData,
                  id: `slot-${Date.now()}`,
                });
              }
            } else {
              // Chế độ Edit slot đã có
              saveSlot(slotData);
            }
            setDraftSlots([]);
            closePopover();
          }}
          onDelete={(slotId) => {
            if (popover.mode === "new") {
              setDraftSlots([]);
            } else {
              deleteSlot(slotId);
            }
            closePopover();
          }}
          onClose={() => {
            // Khi bấm nút X, Esc hoặc click ra ngoài: HỦY DRAFT, KHÔNG LƯU VÀO DB!
            setDraftSlots([]);
            closePopover();
          }}
        />

        {/* Floating Range Indicator bám sát con trỏ chuột khi đang kéo */}
        {isDragging && dragPreview && (
          <div
            style={{
              top: `${Math.max(12, dragPreview.cursorY - 50)}px`,
              left: `${Math.min(window.innerWidth - 240, dragPreview.cursorX + 16)}px`,
            }}
            className="fixed z-50 pointer-events-none flex items-center gap-2 rounded-xl bg-slate-900/95 text-white px-3 py-1.5 shadow-2xl backdrop-blur-md border border-white/20 text-xs font-semibold select-none animate-in fade-in-0 duration-75"
          >
            <Clock size={13} className="text-indigo-400 shrink-0" />
            <span className="text-indigo-200">
              {dragPreview.startDayIndex === dragPreview.endDayIndex
                ? weekDays.find((d) => d.dayIndex === dragPreview.startDayIndex)?.dayName || ""
                : `${weekDays.find((d) => d.dayIndex === dragPreview.startDayIndex)?.dayName || ""} – ${weekDays.find((d) => d.dayIndex === dragPreview.endDayIndex)?.dayName || ""}`}
              :
            </span>
            <span className="text-white font-bold">
              {minutesToTimeString(dragPreview.startMinutes)} – {minutesToTimeString(dragPreview.endMinutes)}
            </span>
            <span className="text-[10px] text-slate-300 font-medium bg-white/10 px-1.5 py-0.5 rounded-md">
              {formatDuration(dragPreview.startMinutes, dragPreview.endMinutes)}
            </span>
          </div>
        )}

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
                  const isSlotInThisDay = (s) => {
                    if (s.dateStr) {
                      return s.dateStr === day.dateStr;
                    }
                    return s.dayIndex === day.dayIndex;
                  };

                  const actualDaySlots = slots.filter(isSlotInThisDay);
                  const draftDaySlots = draftSlots.filter(isSlotInThisDay);
                  const daySlots = [...actualDaySlots, ...draftDaySlots];

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
