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
  const inFlightRef = useRef(false);
  const callbacksRef = useRef({ onServerSlots, onLocked });
  useEffect(() => {
    callbacksRef.current = { onServerSlots, onLocked };
  });

  const flush = useCallback(async () => {
    clearTimeout(retryRef.current);
    // Mỗi lúc chỉ MỘT request lưu: hai request song song có thể tới server sai thứ tự và bản cũ đè bản mới.
    // Sửa tiếp trong lúc đang gửi → request đang chạy xong sẽ tự gửi bản mới nhất.
    if (inFlightRef.current) return;
    const sent = pendingRef.current;
    if (sent === null) return;
    inFlightRef.current = true;
    setStatus("saving");
    let sendLatestNext = false;
    try {
      await calendarService.saveMemberAvailability(sessionId, memberId, sent);
      attemptRef.current = 0;
      if (pendingRef.current === sent) {
        pendingRef.current = null;
        setStatus("saved");
      } else {
        sendLatestNext = true;
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
      sendLatestNext = pendingRef.current !== sent;
    } finally {
      inFlightRef.current = false;
    }
    if (sendLatestNext) flushRef.current();
  }, [sessionId, memberId, cacheKey]);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  // Rời trang (Back, đổi chế độ, đóng tab) khi còn bản chưa gửi: gửi ngay với keepalive thay vì huỷ,
  // nếu không slot vừa kéo sẽ mất và lần sau server ghi đè bản trong cache.
  useEffect(() => {
    const flushOnLeave = () => {
      clearTimeout(debounceRef.current);
      clearTimeout(retryRef.current);
      const pending = pendingRef.current;
      if (pending === null) return;
      pendingRef.current = null;
      calendarService.saveMemberAvailability(sessionId, memberId, pending, { keepalive: true }).catch(() => {});
    };
    window.addEventListener("pagehide", flushOnLeave);
    return () => {
      window.removeEventListener("pagehide", flushOnLeave);
      flushOnLeave();
    };
  }, [sessionId, memberId]);

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
