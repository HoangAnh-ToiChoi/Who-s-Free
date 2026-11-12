import { useEffect, useLayoutEffect, useRef } from "react";
import { supabase } from "~/configs/supabase";

/**
 * Lắng nghe broadcast do Backend phát khi Lead chốt / mở khoá lịch, hoặc mở / đóng bảng Chốt lịch (đang chốt),
 * để màn hình của mọi người khoá hoặc mở lại ngay mà không cần tải lại trang.
 */
export function useSessionFinalizeSync(sessionId, onChange) {
  const onChangeRef = useRef(onChange);
  useLayoutEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (!sessionId || !supabase) return;
    const channel = supabase
      .channel(`session:${sessionId}`)
      .on("broadcast", { event: "SESSION_FINALIZED" }, () => onChangeRef.current?.())
      .on("broadcast", { event: "SESSION_UNFINALIZED" }, () => onChangeRef.current?.())
      .on("broadcast", { event: "SESSION_FINALIZING" }, () => onChangeRef.current?.())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);
}

export default useSessionFinalizeSync;
