import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { calendarService } from "~/service/calendarService/calendarService";

/**
 * useSessionResolver - Hook dùng chung cho cả MemberMatrix & LeadMatrix
 * Đọc trực tiếp từ API/db.json qua calendarService:
 *  - Đọc query param ?session=...
 *  - Tự động chuẩn hóa: nếu truyền ID thì chuyển sang slug
 *  - Nếu chưa có param thì gắn slug mặc định
 *  - Trả về currentSession object
 */
export function useSessionResolver() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionParam = searchParams.get("session");
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);

  // Tải danh sách sessions từ db.json
  useEffect(() => {
    let isMounted = true;
    async function loadSessions() {
      try {
        const data = await calendarService.getGroupCalendars();
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setSessions(data);
        }
      } catch (err) {
        console.warn("Failed to load sessions in resolver:", err);
      }
    }
    loadSessions();
    return () => {
      isMounted = false;
    };
  }, []);

  // Chuẩn hóa param và đồng bộ currentSession
  useEffect(() => {
    if (!sessions.length) return;

    if (sessionParam) {
      const foundSession = sessions.find(
        (s) => s.id === sessionParam || s.slug === sessionParam
      );
      if (foundSession) {
        if (foundSession.slug && foundSession.slug !== sessionParam) {
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              next.set("session", foundSession.slug);
              return next;
            },
            { replace: true }
          );
        }
        setCurrentSession(foundSession);
      } else {
        // Fallback: Thử tìm trực tiếp session qua API nếu vừa được tạo
        calendarService
          .getCalendarById(sessionParam)
          .then((direct) => {
            if (direct) {
              setCurrentSession(direct);
              setSessions((prev) => [...prev, direct]);
            } else {
              setCurrentSession(sessions[0]);
            }
          })
          .catch(() => {
            setCurrentSession(sessions[0]);
          });
      }
    } else {
      const defaultSlug = sessions[0]?.slug;
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
      setCurrentSession(sessions[0]);
    }
  }, [sessionParam, sessions, setSearchParams]);

  return {
    currentSession,
    sessions,
  };
}

export default useSessionResolver;
