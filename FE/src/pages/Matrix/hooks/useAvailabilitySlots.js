import { useState, useMemo, useCallback } from "react";
import { getMondayOfWeek, toISODateString } from "../helper/dateUtils";

// Tạo slot mẫu linh hoạt theo tuần hiện tại thực tế
function createInitialSlots() {
  const monday = getMondayOfWeek(new Date());
  const getDateStr = (offsetDays) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + offsetDays);
    return toISODateString(d);
  };

  return [
    {
      id: "slot-1",
      dayIndex: 0, // MON
      dateStr: getDateStr(0),
      startMinutes: 9 * 60, // 09:00
      endMinutes: 11 * 60 + 30, // 11:30
      label: "Available",
      note: "Prefer morning sync",
    },
    {
      id: "slot-2",
      dayIndex: 1, // TUE (Today)
      dateStr: getDateStr(1),
      startMinutes: 14 * 60, // 14:00
      endMinutes: 16 * 60 + 30, // 16:30
      label: "Available",
      note: "Available after class",
    },
    {
      id: "slot-3",
      dayIndex: 3, // THU
      dateStr: getDateStr(3),
      startMinutes: 10 * 60, // 10:00
      endMinutes: 12 * 60, // 12:00
      label: "Available",
      note: "Free before lab",
    },
  ];
}

/**
 * Hook quản lý riêng biệt dữ liệu và thống kê các khung giờ rảnh (Availability Slots CRUD)
 * Đảm bảo Single Responsibility: Không dính dáng đến DOM hay event kéo thả chuột.
 */
export function useAvailabilitySlots(initialData = null) {
  const [slots, setSlots] = useState(() => initialData || createInitialSlots());

  // Thêm mới hoặc cập nhật slot
  const saveSlot = useCallback((slotPayload) => {
    setSlots((prev) => {
      const idx = prev.findIndex((s) => s.id === slotPayload.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...slotPayload };
        return next;
      }
      return [...prev, slotPayload];
    });
  }, []);

  // Xóa slot theo ID
  const deleteSlot = useCallback((slotId) => {
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
  }, []);

  // Xóa toàn bộ các slot đã chọn
  const clearAllSlots = useCallback(() => {
    setSlots([]);
  }, []);

  // Co giãn slot (Resize edge top / bottom)
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

  // Thống kê tổng số slot và tổng số giờ đã chọn (Tối ưu bằng useMemo)
  const stats = useMemo(() => {
    const totalMinutes = slots.reduce(
      (acc, s) => acc + Math.max(0, s.endMinutes - s.startMinutes),
      0
    );
    const totalHours = (totalMinutes / 60).toFixed(1);
    return {
      count: slots.length,
      totalHours: totalHours.endsWith(".0") ? parseInt(totalHours, 10) : totalHours,
    };
  }, [slots]);

  return {
    slots,
    stats,
    saveSlot,
    deleteSlot,
    clearAllSlots,
    resizeSlot,
  };
}

export default useAvailabilitySlots;
