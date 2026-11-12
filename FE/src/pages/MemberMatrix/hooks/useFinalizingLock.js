import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Trưởng nhóm KHÁC đang mở bảng Chốt lịch (session.finalizing còn hạn) → khoá chỉnh sửa lịch của thành viên.
 * Tới hạn mà chưa có tín hiệu realtime (vd trưởng nhóm tắt trình duyệt) thì tự mở khoá và gọi onExpire
 * để tải lại phiên (nếu trưởng nhóm vẫn đang chốt, hạn mới sẽ được trả về và khoá lại).
 */
export function useFinalizingLock(session, userId, onExpire) {
  const finalizing = session?.finalizing;
  const until = finalizing && finalizing.by !== userId ? finalizing.until : null;
  const [expiredUntil, setExpiredUntil] = useState(null);

  const onExpireRef = useRef(onExpire);
  useLayoutEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    if (!until) return undefined;
    const delay = Math.max(0, new Date(until).getTime() - Date.now()) + 1000;
    const timer = setTimeout(() => {
      setExpiredUntil(until);
      onExpireRef.current?.();
    }, delay);
    return () => clearTimeout(timer);
  }, [until]);

  return Boolean(until) && expiredUntil !== until;
}

export default useFinalizingLock;
