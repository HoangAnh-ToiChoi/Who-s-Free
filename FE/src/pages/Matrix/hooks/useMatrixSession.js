import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { mockSessions } from "~/data/mockData";

/**
 * useMatrixSession - Hook quản lý session hiện tại & chế độ xem (Member vs Lead)
 * - Tự động chuẩn hóa query parameter session: nếu truyền ID thì chuyển sang slug
 * - Quản lý URL query ?mode=lead để đồng bộ trạng thái chế độ Lead View
 */
export function useMatrixSession() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionParam = searchParams.get("session");
  const modeParam = searchParams.get("mode");
  const isLeadMode = modeParam === "lead";

  const toggleLeadMode = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (isLeadMode) {
        next.delete("mode");
      } else {
        next.set("mode", "lead");
      }
      return next;
    });
  };

  // Tự động chuẩn hóa query parameter: nếu là ID (ví dụ ?session=sess-1) thì chuyển sang slug
  useEffect(() => {
    if (sessionParam) {
      const foundSession = mockSessions.find((s) => s.id === sessionParam);
      if (foundSession?.slug && foundSession.slug !== sessionParam) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set("session", foundSession.slug);
            return next;
          },
          { replace: true }
        );
      }
    } else {
      // Mặc định gắn slug của session đầu tiên nếu chưa có query param
      const defaultSlug = mockSessions[0]?.slug;
      if (defaultSlug) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set("session", defaultSlug);
            return next;
          },
          { replace: true }
        );
      }
    }
  }, [sessionParam, setSearchParams]);

  const currentSession =
    mockSessions.find((s) => s.slug === sessionParam || s.id === sessionParam) ||
    mockSessions[0];

  return {
    currentSession,
    isLeadMode,
    toggleLeadMode,
  };
}

export default useMatrixSession;
