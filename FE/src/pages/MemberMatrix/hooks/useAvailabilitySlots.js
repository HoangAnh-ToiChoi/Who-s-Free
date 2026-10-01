import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { getMondayOfWeek, toISODateString } from "~/utils/dateUtils";
import { calendarService } from "~/service/calendarService/calendarService";

/**
 * Hook quản lý dữ liệu và thống kê các khung giờ rảnh (Availability Slots CRUD)
 *
 * Tối ưu hiệu năng:
 * - Cache recordId từ lần load đầu → PATCH trực tiếp, không GET kiểm tra.
 * - Debounce 300ms gom nhiều thao tác kéo thả thành 1 API call duy nhất.
 */
export function useAvailabilitySlots(options = {}) {
  // Hỗ trợ truyền dạng chuỗi sessionId hoặc object { sessionId, memberId, initialData }
  const sessionId =
    typeof options === "string" ? options : options?.sessionId || "sess-1";
  const memberId = options?.memberId || "mem-1";
  const initialData = options?.initialData || null;

  const [slots, setSlots] = useState(() => initialData || []);

  // Cache recordId để PATCH trực tiếp mà không cần GET kiểm tra
  const recordIdRef = useRef(null);

  // Debounce timer ref
  const debounceRef = useRef(null);

  // Tải dữ liệu slots thực tế từ db.json + cache recordId
  useEffect(() => {
    let isMounted = true;
    async function loadRemoteSlots() {
      if (!sessionId) {
        setSlots([]);
        recordIdRef.current = null;
        return;
      }
      try {
        const record = await calendarService.getMemberAvailability(sessionId, memberId);
        if (isMounted) {
          if (record && Array.isArray(record.slots)) {
            setSlots(record.slots);
            recordIdRef.current = record.id; // Cache ID cho PATCH sau này
          } else {
            setSlots([]); // Phiên mới tạo → slot trống rỗng
            recordIdRef.current = null;
          }
        }
      } catch (err) {
        console.warn("Could not load availability from db.json:", err);
        if (isMounted) {
          setSlots([]);
          recordIdRef.current = null;
        }
      }
    }
    loadRemoteSlots();
    return () => {
      isMounted = false;
    };
  }, [sessionId, memberId]);

  // Cleanup debounce timer khi unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  /**
   * Đồng bộ slots lên DB — debounce 300ms
   * Gom nhiều thao tác kéo/resize liên tục thành 1 API call duy nhất
   */
  const syncWithDb = useCallback(
    (updatedSlots) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(async () => {
        try {
          const result = await calendarService.saveMemberAvailability(
            sessionId,
            memberId,
            updatedSlots,
            recordIdRef.current
          );
          // Cập nhật cached recordId (quan trọng cho lần POST đầu tiên → PATCH sau đó)
          if (result?.recordId) {
            recordIdRef.current = result.recordId;
          }
        } catch (err) {
          console.warn("Failed to sync availability:", err);
        }
      }, 300);
    },
    [sessionId, memberId]
  );

  // Thêm mới hoặc cập nhật slot (hỗ trợ cả 1 slot hoặc danh sách nhiều slot cùng lúc)
  const saveSlot = useCallback(
    (slotPayload) => {
      if (Array.isArray(slotPayload)) {
        setSlots((prev) => {
          let next = [...prev];
          slotPayload.forEach((item) => {
            const idx = next.findIndex((s) => s.id === item.id);
            if (idx !== -1) {
              next[idx] = { ...next[idx], ...item };
            } else {
              // Kiểm tra xem đã có slot nào cùng ngày và cùng thời gian chưa (tránh trùng toạ độ chồng lấn)
              const dupIdx = next.findIndex(
                (s) =>
                  s.dayIndex === item.dayIndex &&
                  s.startMinutes === item.startMinutes &&
                  s.endMinutes === item.endMinutes
              );
              if (dupIdx !== -1) {
                next[dupIdx] = { ...next[dupIdx], ...item, id: next[dupIdx].id };
              } else {
                next.push(item);
              }
            }
          });
          syncWithDb(next);
          return next;
        });
        return;
      }

      setSlots((prev) => {
        const idx = prev.findIndex((s) => s.id === slotPayload.id);
        let next;
        if (idx !== -1) {
          next = [...prev];
          next[idx] = { ...next[idx], ...slotPayload };
        } else {
          const dupIdx = prev.findIndex(
            (s) =>
              s.dayIndex === slotPayload.dayIndex &&
              s.startMinutes === slotPayload.startMinutes &&
              s.endMinutes === slotPayload.endMinutes
          );
          if (dupIdx !== -1) {
            next = [...prev];
            next[dupIdx] = { ...next[dupIdx], ...slotPayload, id: next[dupIdx].id };
          } else {
            next = [...prev, slotPayload];
          }
        }
        syncWithDb(next);
        return next;
      });
    },
    [syncWithDb]
  );

  // Xóa slot theo ID
  const deleteSlot = useCallback(
    (slotId) => {
      setSlots((prev) => {
        const next = prev.filter((s) => s.id !== slotId);
        syncWithDb(next);
        return next;
      });
    },
    [syncWithDb]
  );

  // Xóa toàn bộ các slot đã chọn
  const clearAllSlots = useCallback(() => {
    setSlots([]);
    syncWithDb([]);
  }, [syncWithDb]);

  // Co giãn slot (Resize edge top / bottom)
  const resizeSlot = useCallback(
    (slotId, edge, deltaMinutes) => {
      setSlots((prev) => {
        const next = prev.map((s) => {
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
        });
        syncWithDb(next);
        return next;
      });
    },
    [syncWithDb]
  );

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
