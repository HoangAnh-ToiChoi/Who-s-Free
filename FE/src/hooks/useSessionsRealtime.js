import { useEffect, useLayoutEffect, useRef } from "react";
import { supabase } from "~/configs/supabase";
import { sessionService } from "~/service/sessionService/sessionService";

// Gom các thông báo đến sát nhau của cùng một phiên thành MỘT lần gọi lại BE
const REFETCH_DEBOUNCE_MS = 1000;

/**
 * Nghe broadcast "AVAILABILITY_UPDATED" mà Backend phát MỘT lần sau mỗi lần thành viên lưu lịch,
 * chỉ trên kênh `session:<id>` của các phiên đang hiển thị (không nghe postgres_changes của cả bảng),
 * rồi lấy lại session (respondedCount mới) và gọi onSessionUpdate.
 *
 * @param {Array<{id: string}>} sessions - Danh sách session đang hiển thị
 * @param {(updatedSession: object) => void} onSessionUpdate
 */
export function useSessionsRealtime(sessions, onSessionUpdate) {
  const onUpdateRef = useRef(onSessionUpdate);
  useLayoutEffect(() => {
    onUpdateRef.current = onSessionUpdate;
  });

  // Serialize session IDs thành string để làm dependency ổn định
  const sessionIdsKey = sessions.map((s) => s.id).join(",");

  useEffect(() => {
    if (!sessionIdsKey || !supabase) return undefined;
    const timers = new Map();

    const scheduleRefetch = (sessionId) => {
      clearTimeout(timers.get(sessionId));
      timers.set(
        sessionId,
        setTimeout(async () => {
          timers.delete(sessionId);
          const updated = await sessionService.getSessionById(sessionId).catch(() => null);
          if (updated) onUpdateRef.current(updated);
        }, REFETCH_DEBOUNCE_MS)
      );
    };

    const channels = sessionIdsKey
      .split(",")
      .filter(Boolean)
      .map((sessionId) =>
        supabase
          .channel(`session:${sessionId}`)
          .on("broadcast", { event: "AVAILABILITY_UPDATED" }, () => scheduleRefetch(sessionId))
          .subscribe()
      );

    return () => {
      timers.forEach(clearTimeout);
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
  }, [sessionIdsKey]);
}

export default useSessionsRealtime;
