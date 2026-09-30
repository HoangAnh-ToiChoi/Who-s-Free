import { useState, useCallback, useRef, useEffect } from "react";

// Tiện ích chuyển đổi số phút sang chuỗi "HH:mm" (ví dụ: 540 -> "09:00", 690 -> "11:30")
export function minutesToTimeString(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Tiện ích chuyển chuỗi "HH:mm" sang số phút
export function timeStringToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + (m || 0);
}

// Tiện ích format số phút sang dạng "2h 30m" hoặc "2h"
export function formatDuration(startMinutes, endMinutes) {
  const total = Math.max(0, endMinutes - startMinutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

// Dữ liệu mẫu 3 slot ban đầu giống 100% trong ảnh prototype
const INITIAL_SLOTS = [
  {
    id: "slot-1",
    dayIndex: 0, // MON Oct 20
    startMinutes: 9 * 60, // 09:00
    endMinutes: 11 * 60 + 30, // 11:30 (2h 30m)
    label: "Available",
    note: "Prefer morning sync",
  },
  {
    id: "slot-2",
    dayIndex: 2, // WED Oct 22
    startMinutes: 14 * 60, // 14:00
    endMinutes: 16 * 60 + 30, // 16:30 (2h 30m)
    label: "Available (Active)",
    note: "Available after class",
  },
  {
    id: "slot-3",
    dayIndex: 4, // FRI Oct 24
    startMinutes: 10 * 60, // 10:00
    endMinutes: 12 * 60, // 12:00 (2h)
    label: "Available",
    note: "Free before lab",
  },
];

/**
 * Custom hook quản lý toàn bộ thuật toán tương tác Lưới Kéo Thả (Grid Drag & Drop)
 * và trạng thái Popover chỉnh sửa slot.
 */
export function useAvailabilityGrid(initialData = INITIAL_SLOTS) {
  const [slots, setSlots] = useState(initialData);

  // Trạng thái kéo thả
  const [dragState, setDragState] = useState(null);
  // { dayIndex, startMinutes, currentMinutes, isDragging }

  // Trạng thái popover chỉnh sửa / thêm mới
  const [popover, setPopover] = useState({
    isOpen: false,
    mode: "new", // "new" | "edit"
    slotData: null,
    anchorPos: { top: 0, left: 0, right: 0, bottom: 0, placement: "right" },
  });

  // Bắt đầu kéo thả chọn vùng
  const startDrag = useCallback((dayIndex, startMinutes) => {
    // Snap về mốc 30 phút
    const snappedStart = Math.floor(startMinutes / 30) * 30;
    setDragState({
      dayIndex,
      startMinutes: snappedStart,
      currentMinutes: snappedStart + 30,
      isDragging: true,
    });
  }, []);

  // Đang rê chuột
  const updateDrag = useCallback(
    (currentMinutes) => {
      if (!dragState?.isDragging) return;
      const snappedCurrent = Math.floor(currentMinutes / 30) * 30;
      setDragState((prev) => ({
        ...prev,
        currentMinutes: Math.max(snappedCurrent, prev.startMinutes + 30),
      }));
    },
    [dragState]
  );

  // Thả chuột ➔ Mở ngay Popover New Availability
  const endDrag = useCallback(
    (anchorElementRect, gridContainerRect) => {
      if (!dragState?.isDragging) return;

      const rawStart = dragState.startMinutes;
      const rawEnd = dragState.currentMinutes;
      const start = Math.min(rawStart, rawEnd);
      const end = Math.max(rawStart, rawEnd);

      // Đảm bảo tối thiểu 30 phút
      const finalEnd = end === start ? start + 30 : end;

      const newSlotDraft = {
        id: `draft-${Date.now()}`,
        dayIndex: dragState.dayIndex,
        startMinutes: start,
        endMinutes: finalEnd,
        label: "Available",
        note: "",
      };

      setDragState(null);

      // Tính vị trí popover neo vào khối vừa kéo
      calculatePopoverPosition(anchorElementRect, gridContainerRect, newSlotDraft, "new");
    },
    [dragState]
  );

  // Hủy kéo thả
  const cancelDrag = useCallback(() => {
    setDragState(null);
  }, []);

  // Mở popover để chỉnh sửa slot đã có sẵn khi click vào
  const openEditSlot = useCallback(
    (slot, anchorElementRect, gridContainerRect) => {
      calculatePopoverPosition(anchorElementRect, gridContainerRect, slot, "edit");
    },
    []
  );

  // Tính toán vị trí neo Popover thông minh (có mũi tên trỏ vào slot)
  const calculatePopoverPosition = (anchorRect, gridRect, slotData, mode) => {
    if (!anchorRect) return;

    const popoverWidth = 320;
    const popoverHeight = 290;

    // Tọa độ tương đối so với container lưới
    const relTop = anchorRect.top - (gridRect ? gridRect.top : 0);
    const relLeft = anchorRect.left - (gridRect ? gridRect.left : 0);
    const relRight = (gridRect ? gridRect.right : window.innerWidth) - anchorRect.right;

    // Nếu khoảng trống bên phải đủ rộng (> 340px) thì đặt sang bên phải, ngược lại đặt sang bên trái
    const placeRight = relRight >= popoverWidth + 20;

    const left = placeRight
      ? relLeft + anchorRect.width + 12
      : Math.max(10, relLeft - popoverWidth - 12);

    // Căn giữa theo chiều dọc của slot
    const top = Math.max(
      10,
      relTop + anchorRect.height / 2 - popoverHeight / 2
    );

    setPopover({
      isOpen: true,
      mode,
      slotData,
      anchorPos: {
        top,
        left,
        placement: placeRight ? "right" : "left",
      },
    });
  };

  // Lưu slot (Thêm mới hoặc cập nhật)
  const saveSlot = useCallback((updatedSlot) => {
    setSlots((prev) => {
      const exists = prev.some((s) => s.id === updatedSlot.id);
      if (exists) {
        return prev.map((s) => (s.id === updatedSlot.id ? updatedSlot : s));
      }
      return [...prev, updatedSlot];
    });
    setPopover((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Xóa slot
  const deleteSlot = useCallback((slotId) => {
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
    setPopover((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Đóng popover
  const closePopover = useCallback(() => {
    setPopover((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Xóa toàn bộ slot đã chọn
  const clearAllSlots = useCallback(() => {
    setSlots([]);
    setPopover((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Co giãn slot (Resize handle top hoặc bottom)
  const resizeSlot = useCallback((slotId, edge, deltaMinutes) => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        if (edge === "top") {
          const newStart = Math.min(s.endMinutes - 30, s.startMinutes + deltaMinutes);
          return { ...s, startMinutes: Math.max(0, newStart) };
        }
        if (edge === "bottom") {
          const newEnd = Math.max(s.startMinutes + 30, s.endMinutes + deltaMinutes);
          return { ...s, endMinutes: newEnd };
        }
        return s;
      })
    );
  }, []);

  // Thống kê tổng số slot và tổng số giờ đã chọn
  const totalMinutes = slots.reduce(
    (acc, s) => acc + (s.endMinutes - s.startMinutes),
    0
  );
  const totalHours = (totalMinutes / 60).toFixed(1);

  return {
    slots,
    dragState,
    popover,
    totalSlots: slots.length,
    totalHours,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
    openEditSlot,
    saveSlot,
    deleteSlot,
    closePopover,
    clearAllSlots,
    resizeSlot,
  };
}

export default useAvailabilityGrid;
