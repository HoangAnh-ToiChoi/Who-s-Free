import { useState, useEffect } from "react";
import { useParams, useLocation, useSearchParams, useNavigate } from "react-router";
import { calendarService } from "~/service/calendarService/calendarService";
import { createCompositeSlug, extractIdFromSlug } from "~/utils/slugify";

/**
 * useSessionResolver - Hook giải mã và đồng bộ phiên khảo sát (Session)
 * Hỗ trợ nhận diện slug trực tiếp từ Route Path (/matrix/:sessionSlug)
 * kết hợp State Router để hiển thị tức thì frame 0 (Zero-Wait) mà không bị giật lag.
 *
 * @returns {{ currentSession: Object|null, sessions: Array }}
 */
export function useSessionResolver() {
  const { sessionSlug } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Ưu tiên sessionSlug từ Route Path, fallback sang query param ?session= nếu có
  const activeSlug = sessionSlug || searchParams.get("session");

  // Nếu trang trước truyền sẵn session qua router state -> nạp ngay lập tức
  const passedSession = location.state?.session || null;
  const [sessions, setSessions] = useState(passedSession ? [passedSession] : []);
  const [currentSession, setCurrentSession] = useState(passedSession);

  // 1. Tải danh sách sessions từ API / db.json
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

  // 2. Đồng bộ currentSession theo slug trên URL
  useEffect(() => {
    if (!sessions.length) return;

    if (activeSlug) {
      const actualId = extractIdFromSlug(activeSlug);
      const foundSession = sessions.find(
        (s) => s.id === actualId || s.id === activeSlug || s.slug === activeSlug
      );

      if (foundSession) {
        setCurrentSession(foundSession);
      } else {
        // Fallback: Tìm trực tiếp session qua API bằng actualId
        calendarService
          .getCalendarById(actualId || activeSlug)
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
      // Nếu vào trang bare (/matrix hoặc /lead-matrix) chưa có slug -> tự chuyển hướng tới session đầu tiên
      const first = sessions[0];
      if (first) {
        const canonicalSlug = createCompositeSlug(first.title, first.id);
        const basePath = location.pathname.startsWith("/lead-matrix")
          ? "/lead-matrix"
          : "/matrix";
        navigate(`${basePath}/${canonicalSlug}`, {
          replace: true,
          state: { session: first },
        });
        setCurrentSession(first);
      }
    }
  }, [activeSlug, sessions, location.pathname, navigate]);

  return {
    currentSession,
    sessions,
  };
}

export default useSessionResolver;
