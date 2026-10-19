import { useState, useEffect } from "react";
import { useParams, useLocation, useSearchParams, useNavigate } from "react-router";
import { calendarService } from "~/service/calendarService/calendarService";
import { createCompositeSlug, extractIdFromSlug } from "~/utils/slugify";

/**
 * useSessionResolver - Hook giải mã và đồng bộ phiên khảo sát (Session)
 * Hỗ trợ nhận diện slug trực tiếp từ Route Path /groups/:groupId/matrix/:sessionSlug
 * kết hợp State Router để hiển thị tức thì frame 0 (Zero-Wait) mà không bị giật lag.
 *
 * @returns {{ currentSession: Object|null, sessions: Array }}
 */
export function useSessionResolver() {
  const { sessionSlug: routeSessionSlug, groupId } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const activeSlug = routeSessionSlug || searchParams.get("session");

  const passedSession = location.state?.session || null;
  const [sessions, setSessions] = useState(passedSession ? [passedSession] : []);
  const [currentSession, setCurrentSession] = useState(passedSession);

  // 1. Tải danh sách sessions theo group (group-scoped)
  useEffect(() => {
    let isMounted = true;
    async function loadSessions() {
      try {
        const data = await calendarService.getGroupCalendars(groupId);
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
  }, [groupId]);

  // 2. Đồng bộ currentSession theo slug trên URL
  useEffect(() => {
    if (!sessions.length) return;

    if (activeSlug) {
      const actualId = extractIdFromSlug(activeSlug);
      const foundSession = sessions.find(
        (s) => s.id === actualId || s.id === activeSlug || s.slug === activeSlug
      );

      if (foundSession) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentSession(foundSession);
      } else {
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
      // Bare route /groups/:groupId/matrix → redirect tới session đầu tiên của group
      const first = sessions[0];
      if (first) {
        const canonicalSlug = createCompositeSlug(first.title, first.id);
        const isLead = location.pathname.includes("/lead-matrix");
        const matrixBase = isLead ? "lead-matrix" : "matrix";
        navigate(`/groups/${groupId}/${matrixBase}/${canonicalSlug}`, {
          replace: true,
          state: { session: first },
        });
        setCurrentSession(first);
      }
    }
  }, [activeSlug, sessions, location.pathname, navigate, groupId]);

  return {
    currentSession,
    sessions,
  };
}

export default useSessionResolver;
