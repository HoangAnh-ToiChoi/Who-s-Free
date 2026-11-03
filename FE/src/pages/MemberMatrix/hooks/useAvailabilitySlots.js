import { useState, useCallback, useEffect, useRef } from "react";
import { availabilityService as calendarService } from "~/service/availabilityService/availabilityService";
import { getCachedSlots, setCachedSlots } from "~/utils/availabilityCache";
import { useAvailabilitySync } from "./useAvailabilitySync";

export function useAvailabilitySlots(options = {}) {
  const sessionId = typeof options === "string" ? options : options?.sessionId ?? null;
  const memberId = options?.memberId ?? null;
  const initialData = options?.initialData ?? null;
  // Gọi khi server báo phiên đã chốt trong lúc lưu (để trang chuyển sang màn đã chốt ngay)
  const onLocked = options?.onLocked;
  // cacheKey: slug dễ đọc cho localStorage; sessionId: UUID thật cho API
  const cacheKey = options?.cacheKey ?? sessionId;

  const [slots, setSlots] = useState(() => getCachedSlots(cacheKey, memberId) ?? initialData ?? []);

  const hasLocalChangesRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    hasLocalChangesRef.current = false;

    async function load() {
      if (!sessionId) {
        setSlots([]);
        return;
      }

      const cached = getCachedSlots(cacheKey, memberId);
      if (cached && isMounted) setSlots(cached);

      try {
        const record = await calendarService.getMemberAvailability(sessionId, memberId);
        if (!isMounted) return;

        if (record && Array.isArray(record.slots)) {
          // Chỉ ghi đè nếu user chưa tương tác trong lúc fetch — tránh race condition
          if (!hasLocalChangesRef.current) {
            setSlots(record.slots);
            setCachedSlots(cacheKey, memberId, record.slots);
          }
        } else if (!cached && !hasLocalChangesRef.current) {
          setSlots([]);
          }
      } catch {
        if (isMounted && !cached && !hasLocalChangesRef.current) {
          setSlots([]);
          }
      }
    }

    load();
    return () => { isMounted = false; };
  }, [sessionId, cacheKey, memberId]);

  const { status: saveStatus, queueSave, retryNow: retrySave } = useAvailabilitySync({
    sessionId,
    memberId,
    cacheKey,
    // Server là nguồn sự thật: slot vẽ lạc quan nhưng bị từ chối sẽ bị thay bằng slot server trả về
    onServerSlots: (serverSlots) => {
      hasLocalChangesRef.current = false;
      setSlots(serverSlots);
    },
    onLocked,
  });

  const syncWithDb = useCallback(
    (updatedSlots) => {
      hasLocalChangesRef.current = true;
      queueSave(updatedSlots);
    },
    [queueSave]
  );

  const saveSlot = useCallback(
    (slotPayload) => {
      const items = Array.isArray(slotPayload) ? slotPayload : [slotPayload];
      setSlots((prev) => {
        const next = [...prev];
        for (const item of items) {
          const idx = next.findIndex((s) => s.id === item.id);
          if (idx !== -1) {
            next[idx] = { ...next[idx], ...item };
          } else {
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
        }
        syncWithDb(next);
        return next;
      });
    },
    [syncWithDb]
  );

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

  const clearAllSlots = useCallback(() => {
    setSlots([]);
    syncWithDb([]);
  }, [syncWithDb]);

  return { slots, saveSlot, deleteSlot, clearAllSlots, saveStatus, retrySave };
}

export default useAvailabilitySlots;
