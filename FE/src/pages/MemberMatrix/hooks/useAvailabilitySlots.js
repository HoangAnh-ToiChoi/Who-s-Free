import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { availabilityService as calendarService } from "~/service/availabilityService/availabilityService";
import { getCachedSlots, setCachedSlots } from "~/utils/availabilityCache";

export function useAvailabilitySlots(options = {}) {
  const sessionId = typeof options === "string" ? options : options?.sessionId ?? null;
  const memberId = options?.memberId ?? null;
  const initialData = options?.initialData ?? null;
  // cacheKey: slug dễ đọc cho localStorage; sessionId: UUID thật cho API
  const cacheKey = options?.cacheKey ?? sessionId;

  const [slots, setSlots] = useState(() => getCachedSlots(cacheKey, memberId) ?? initialData ?? []);

  const recordIdRef = useRef(null);
  const debounceRef = useRef(null);
  const hasLocalChangesRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    hasLocalChangesRef.current = false;

    async function load() {
      if (!sessionId) {
        setSlots([]);
        recordIdRef.current = null;
        return;
      }

      const cached = getCachedSlots(cacheKey, memberId);
      if (cached && isMounted) setSlots(cached);

      try {
        const record = await calendarService.getMemberAvailability(sessionId, memberId);
        if (!isMounted) return;

        if (record && Array.isArray(record.slots)) {
          recordIdRef.current = record.id;
          // Chỉ ghi đè nếu user chưa tương tác trong lúc fetch — tránh race condition
          if (!hasLocalChangesRef.current) {
            setSlots(record.slots);
            setCachedSlots(cacheKey, memberId, record.slots);
          }
        } else if (!cached && !hasLocalChangesRef.current) {
          setSlots([]);
          recordIdRef.current = null;
        }
      } catch {
        if (isMounted && !cached && !hasLocalChangesRef.current) {
          setSlots([]);
          recordIdRef.current = null;
        }
      }
    }

    load();
    return () => { isMounted = false; };
  }, [sessionId, cacheKey, memberId]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const syncWithDb = useCallback(
    (updatedSlots) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      hasLocalChangesRef.current = true;
      setCachedSlots(cacheKey, memberId, updatedSlots);

      debounceRef.current = setTimeout(async () => {
        try {
          const result = await calendarService.saveMemberAvailability(sessionId, memberId, updatedSlots);
          if (result?.recordId) recordIdRef.current = result.recordId;
        } catch (err) {
          console.error("[availability] save failed:", err?.message || err);
        }
      }, 300);
    },
    [sessionId, cacheKey, memberId]
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

  const resizeSlot = useCallback(
    (slotId, edge, deltaMinutes) => {
      setSlots((prev) => {
        const next = prev.map((s) => {
          if (s.id !== slotId) return s;
          if (edge === "top") {
            return { ...s, startMinutes: Math.max(0, Math.min(s.endMinutes - 30, s.startMinutes + deltaMinutes)) };
          }
          if (edge === "bottom") {
            return { ...s, endMinutes: Math.max(s.startMinutes + 30, s.endMinutes + deltaMinutes) };
          }
          return s;
        });
        syncWithDb(next);
        return next;
      });
    },
    [syncWithDb]
  );

  const stats = useMemo(() => {
    const totalMinutes = slots.reduce((acc, s) => acc + Math.max(0, s.endMinutes - s.startMinutes), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    return {
      count: slots.length,
      totalHours: totalHours.endsWith(".0") ? parseInt(totalHours, 10) : totalHours,
    };
  }, [slots]);

  return { slots, stats, saveSlot, deleteSlot, clearAllSlots, resizeSlot };
}

export default useAvailabilitySlots;
