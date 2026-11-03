import { useCallback, useEffect, useRef, useState } from "react";
import { availabilityService as calendarService } from "~/service/availabilityService/availabilityService";
import { setCachedSlots } from "~/utils/availabilityCache";
import { classifySaveError, RETRY_DELAYS_MS } from "~/utils/saveRetry";

const SAVE_DEBOUNCE_MS = 300;

/**
 * Đồng bộ slot lên server: UI đã vẽ trước (lạc quan), hook này gửi bản MỚI NHẤT sau 300ms và giữ trạng thái thật.
 * status: idle | saving | saved | retrying | failed | locked.
 * Server từ chối vì phiên đã chốt → ghi đè UI/cache bằng slot server gửi kèm (onServerSlots) rồi gọi onLocked.
 */
export function useAvailabilitySync({ sessionId, memberId, cacheKey, onServerSlots, onLocked }) {
  const [status, setStatus] = useState("idle");
  const pendingRef = useRef(null);
  const attemptRef = useRef(0);
  const debounceRef = useRef(null);
  const retryRef = useRef(null);
  const flushRef = useRef(null);
  const callbacksRef = useRef({ onServerSlots, onLocked });
  useEffect(() => {
    callbacksRef.current = { onServerSlots, onLocked };
  });

  const flush = useCallback(async () => {
    clearTimeout(retryRef.current);
    const sent = pendingRef.current;
    if (sent === null) return;
    setStatus("saving");
    try {
      await calendarService.saveMemberAvailability(sessionId, memberId, sent);
      attemptRef.current = 0;
      // Trong lúc gửi người dùng có thể đã sửa tiếp → bản mới vẫn đang chờ, chưa tính là "đã lưu"
      if (pendingRef.current === sent) {
        pendingRef.current = null;
        setStatus("saved");
      }
    } catch (error) {
      const kind = classifySaveError(error);
      if (kind === "locked") {
        pendingRef.current = null;
        attemptRef.current = 0;
        const serverSlots = Array.isArray(error?.details?.slots) ? error.details.slots : [];
        setCachedSlots(cacheKey, memberId, serverSlots);
        callbacksRef.current.onServerSlots?.(serverSlots);
        setStatus("locked");
        callbacksRef.current.onLocked?.();
        return;
      }
      if (kind === "retry" && attemptRef.current < RETRY_DELAYS_MS.length) {
        setStatus("retrying");
        retryRef.current = setTimeout(() => flushRef.current(), RETRY_DELAYS_MS[attemptRef.current++]);
        return;
      }
      attemptRef.current = 0;
      setStatus("failed");
    }
  }, [sessionId, memberId, cacheKey]);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  useEffect(
    () => () => {
      clearTimeout(debounceRef.current);
      clearTimeout(retryRef.current);
    },
    []
  );

  const queueSave = useCallback(
    (slots) => {
      pendingRef.current = slots;
      setCachedSlots(cacheKey, memberId, slots);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => flushRef.current(), SAVE_DEBOUNCE_MS);
    },
    [cacheKey, memberId]
  );

  const retryNow = useCallback(() => {
    attemptRef.current = 0;
    flushRef.current();
  }, []);

  return { status, queueSave, retryNow };
}
