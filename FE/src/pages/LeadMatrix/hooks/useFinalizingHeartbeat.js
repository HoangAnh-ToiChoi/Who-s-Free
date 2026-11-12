import { useEffect, useState } from "react";
import { sessionService } from "~/service/sessionService/sessionService";

// BE giữ trạng thái "đang chốt" 10 phút mỗi lần gọi; gia hạn mỗi 3 phút khi bảng còn mở và tab đang hiển thị
const HEARTBEAT_MS = 3 * 60 * 1000;

/**
 * Khi bảng Chốt lịch đang mở (active): báo BE "trưởng nhóm đang chốt" để thành viên khác tạm không sửa lịch,
 * gia hạn định kỳ, và bỏ đánh dấu khi đóng bảng / rời trang / đóng tab.
 * Trả về thông báo lỗi nếu một trưởng nhóm khác đang chốt cùng phiên.
 */
export function useFinalizingHeartbeat(sessionId, active) {
  const [conflict, setConflict] = useState("");

  useEffect(() => {
    if (!sessionId || !active) return undefined;
    let closed = false;

    const ping = () => {
      if (document.visibilityState !== "visible") return;
      sessionService
        .startFinalizing(sessionId)
        .then(() => !closed && setConflict(""))
        .catch((error) => {
          if (!closed) setConflict(error?.code === "SESSION_FINALIZING_BY_OTHER" ? error.message : "");
        });
    };
    const release = (keepalive) => sessionService.stopFinalizing(sessionId, { keepalive }).catch(() => {});
    const onPageHide = () => release(true);

    ping();
    const timer = setInterval(ping, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", ping);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      closed = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", ping);
      window.removeEventListener("pagehide", onPageHide);
      release(false);
    };
  }, [sessionId, active]);

  return active ? conflict : "";
}

export default useFinalizingHeartbeat;
