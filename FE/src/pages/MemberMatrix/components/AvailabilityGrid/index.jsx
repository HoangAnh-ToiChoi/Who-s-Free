import { useRef, useState, useMemo, useEffect } from "react";
import GridToolbar from "../GridToolbar";
import GridScrollArea from "./GridScrollArea";
import DragRangeIndicator from "./DragRangeIndicator";
import SlotPopover from "../SlotPopover";
import SaveStatusIndicator from "../SaveStatusIndicator";
import { buildDraftSlots, promoteDrafts, popoverOverlaps, pickWindowDays } from "./draftSlots";

import { START_HOUR, END_HOUR, HOUR_HEIGHT } from "~/utils/timeUtils";
import { initialDayIndex } from "~/utils/dateUtils";
import { useAvailabilitySlots } from "../../hooks/useAvailabilitySlots";
import { useGridDrag } from "../../hooks/useGridDrag";
import { useWeekSlots } from "../../hooks/useWeekSlots";
import { useTouchDragStart } from "../../hooks/useTouchDragStart";
import { useSlotPopover } from "../../hooks/useSlotPopover";
import {
  useWeekNavigation,
  useScrollRestoration,
  useDayPager,
} from "~/hooks";

const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

/**
 * AvailabilityGrid - Lưới nhập lịch rảnh của thành viên: điều hướng tuần, kéo chọn khung 30 phút,
 * popover chỉnh slot. Mobile hiện 3 ngày/màn với cột giờ cố định (xem GridScrollArea).
 */
function AvailabilityGrid({ sessionId, sessionCacheKey, dateWindow, memberId, onSessionLocked }) {
  const containerRef = useRef(null);
  const scrollBodyRef = useRef(null);
  const columnRefs = useRef([]);

  // Tự động lưu và phục hồi vị trí cuộn khi F5 (Mặc định cuộn tới 08:00 nếu chưa có dữ liệu lưu)
  useScrollRestoration("matrix_availability_grid", {
    ref: scrollBodyRef,
    defaultScrollTop: 8 * HOUR_HEIGHT,
  });

  // 1. Hook quản lý ngày tháng & tuần
  const { weekDays, weekLabel, weekNav } = useWeekNavigation(dateWindow);

  // Mobile: lưới hiện 3/7 ngày → cuộn ngang tới hôm nay, hoặc ngày đầu tiên trong khoảng khảo sát
  const { scrollToDay } = useDayPager(scrollBodyRef, { timeColumnWidth: 48 });
  useEffect(() => {
    scrollToDay(Math.min(initialDayIndex(weekDays), 4), "auto");
  }, [weekDays, scrollToDay]);

  // 2. Hook quản lý danh sách slot rảnh & thống kê
  const {
    slots,
    saveSlot,
    deleteSlot,
    clearAllSlots,
    saveStatus,
    retrySave,
  } = useAvailabilitySlots({ sessionId, cacheKey: sessionCacheKey, memberId, onLocked: onSessionLocked });

  const { currentWeekSlots, weekStats } = useWeekSlots(slots, weekDays);

  // 3. State quản lý các slot tạm thời (draft) khi người dùng vừa kéo chuột xong nhưng chưa bấm Áp dụng
  const [draftSlots, setDraftSlots] = useState([]);

  // Danh sách slot dùng để tính toán va chạm kéo thả của tuần hiện tại
  const visibleExistingSlots = useMemo(() => {
    return [...currentWeekSlots, ...draftSlots];
  }, [currentWeekSlots, draftSlots]);

  // 4. Hook quản lý popover tuỳ chỉnh slot (Chỉnh sửa giờ, note, xoá)
  const { popover, openPopover, closePopover } = useSlotPopover();

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
      const target = pickWindowDays(weekDays, dayIndices, dayIndex);
      if (!target) return;
      const { drafts, active } = buildDraftSlots({ weekDays, ...target, startMinutes, endMinutes });
      // Chỉ lưu vào draftSlots để hiển thị tạm trên lưới, KHÔNG LƯU vào DB khi chưa bấm Áp dụng
      setDraftSlots(drafts);
      openPopover({
        mode: "new",
        slotData: drafts.length > 1 ? { ...active, dayIndices: target.dayIndices, createdSlots: drafts } : active,
        anchorRect,
        containerRect,
      });
    },
  });

  // Cảm ứng: nhấn giữ rồi kéo (vuốt ngay = cuộn lưới)
  const touchDrag = useTouchDragStart(startDrag);

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
    <div className="flex flex-col h-full gap-1.5 sm:gap-2.5 flex-1 min-h-0">
      {/* 1. Thanh công cụ tuần (Google Calendar Navigation Toolbar) */}
      <GridToolbar
        weekLabel={weekLabel}
        stats={weekStats}
        weekNav={weekNav}
        onClearAll={clearAllSlots}
        touchDragPreview={isDragging && dragPreview?.isTouch ? dragPreview : null}
        weekDays={weekDays}
      />

      <SaveStatusIndicator status={saveStatus} onRetry={retrySave} />

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
          hasConflict={(startMinutes, endMinutes) =>
            popoverOverlaps({ slots, draftSlots, editingSlot: popover.slotData, startMinutes, endMinutes })}
          onSave={(slotData) => {
            // "new": lúc bấm Áp dụng MỚI chính thức lưu draft vào slots & DB; "edit": lưu slot đã có
            saveSlot(popover.mode === "new" ? promoteDrafts(draftSlots, slotData) : slotData);
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

        {isDragging && dragPreview && !dragPreview.isTouch && (
          <DragRangeIndicator dragPreview={dragPreview} weekDays={weekDays} />
        )}

        <GridScrollArea
          scrollRef={scrollBodyRef}
          columnRefs={columnRefs}
          weekDays={weekDays}
          hours={HOURS}
          slots={slots}
          draftSlots={draftSlots}
          dragPreview={dragPreview}
          activeSlotId={popover.isOpen ? popover.slotData?.id : null}
          onStartDrag={startDrag}
          touch={touchDrag}
          onSlotClick={handleSlotClick}
        />
      </div>
    </div>
  );
}

export default AvailabilityGrid;
