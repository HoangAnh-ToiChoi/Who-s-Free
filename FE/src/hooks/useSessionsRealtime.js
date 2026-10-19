import { useEffect, useRef } from "react";
import { supabase } from "~/configs/supabase";
import { sessionService } from "~/service/sessionService/sessionService";

/**
 * Subscribe Supabase Realtime trên bảng availability_slots.
 * Khi bất kỳ thành viên nào kéo thả slot, callback onSessionUpdate được gọi
 * với dữ liệu session mới nhất (respondedCount đã cập nhật).
 *
 * @param {Array<{id: string}>} sessions - Danh sách session đang hiển thị
 * @param {(updatedSession: object) => void} onSessionUpdate
 */
export function useSessionsRealtime(sessions, onSessionUpdate) {
  const onUpdateRef = useRef(onSessionUpdate);
  onUpdateRef.current = onSessionUpdate;

  // Serialize session IDs thành string để làm dependency ổn định
  const sessionIdsKey = sessions.map((s) => s.id).join(",");

  useEffect(() => {
    if (!sessionIdsKey || !supabase) return;
    const ids = sessionIdsKey.split(",").filter(Boolean);

    const channel = supabase
      .channel("sessions-responded-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "availability_slots" },
        async (payload) => {
          const changedSessionId =
            payload.new?.session_id ?? payload.old?.session_id;
          if (!changedSessionId || !ids.includes(changedSessionId)) return;

          const updated = await sessionService.getSessionById(changedSessionId);
          if (updated) onUpdateRef.current(updated);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionIdsKey]);
}

export default useSessionsRealtime;
