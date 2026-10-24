import { useState, useEffect } from "react";
import { useParams, useLocation, useSearchParams, useNavigate } from "react-router";
import { sessionService as calendarService } from "~/service/sessionService/sessionService";
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

  // Ưu tiên session truyền qua router, sau đó tới session đã được tải sẵn (frame đầu có dữ liệu ngay)
  const passedSession =
    location.state?.session || (activeSlug ? calendarService.peekCalendar(activeSlug) : null) || null;
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
    // Khi sessions rỗng (getGroupCalendars trả về empty vì slug ≠ UUID) nhưng có slug
    // trên URL → resolve thẳng qua ID trong composite slug, không cần session list
    if (!sessions.length) {
      if (!activeSlug) return;
      const actualId = extractIdFromSlug(activeSlug);
      calendarService
        .getCalendarById(actualId || activeSlug)
        .then((direct) => {
          if (direct) {
            setCurrentSession(direct);
            setSessions([direct]);
          }
        })
        .catch(() => {});
      return;
    }

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

  /** Gộp dữ liệu session mới (vd: sau khi chốt / mở khoá) vào session đang xem. */
  const updateCurrentSession = (patchData) => {
    if (patchData) setCurrentSession((prev) => (prev ? { ...prev, ...patchData } : patchData));
  };

  /** Tải lại session từ Backend (vd: khi nhận realtime chốt / mở khoá từ Lead). */
  const refreshCurrentSession = async () => {
    if (!currentSession?.id) return;
    const fresh = await calendarService
      .getCalendarById(currentSession.id, { fresh: true })
      .catch(() => null);
    if (fresh) setCurrentSession((prev) => (prev ? { ...prev, ...fresh } : fresh));
  };

  return {
    currentSession,
    sessions,
    updateCurrentSession,
    refreshCurrentSession,
  };
}

export default useSessionResolver;
