import http from "~/utils/http";
import { extractIdFromSlug } from "~/utils/slugify";
import { calculateSessionMetrics } from "~/utils/matrixCalculations";
import { cachedFetch, peekCached } from "~/utils/prefetchCache";
import { availabilityService } from "~/service/availabilityService/availabilityService";

const calendarKey = (id) => `session:${id}`;

async function fetchCalendar(identifier, actualId, fresh) {
  let session = await http.get(`/sessions/${actualId}`).catch(() => null);
  if (!session && actualId !== identifier) {
    session = await http.get(`/sessions/${identifier}`).catch(() => null);
  }
  if (!session) {
    const list = await http.get(`/sessions?slug=${identifier}`).catch(() => []);
    session = list?.[0];
  }
  if (!session) throw new Error("Calendar session not found");

  const safeAvails = await availabilityService.getSessionAvailabilities(session.id, { fresh });
  const metrics = calculateSessionMetrics(session, safeAvails);
  return {
    ...session,
    ...metrics,
    respondedCount: session.respondedCount ?? metrics.respondedCount,
    quorumPercent: session.quorumPercent ?? metrics.quorumPercent,
  };
}

export const sessionService = {
  async getGroupCalendars(groupId) {
    try {
      const actualGroupId = groupId ? extractIdFromSlug(groupId) : null;
      const sessionPromise = actualGroupId
        ? http.get(`/sessions?groupId=${actualGroupId}`)
        : http.get("/sessions");

      const sessions = await sessionPromise.catch(() => []);
      const sessionList = Array.isArray(sessions) ? sessions : [];

      return sessionList.map((session) => {
        const metrics = calculateSessionMetrics(session, []);
        return {
          ...session,
          ...metrics,
          respondedCount: session.respondedCount ?? metrics.respondedCount,
          quorumPercent: session.quorumPercent ?? metrics.quorumPercent,
        };
      });
    } catch (err) {
      console.error("Failed to fetch group calendars:", err);
      return [];
    }
  },

  /**
   * Lấy session (kèm số liệu phản hồi). Ném lỗi nếu không tải được.
   * Kết quả được giữ ngắn hạn để trang tải trước rồi hiển thị ngay; { fresh: true } luôn hỏi lại Backend.
   */
  getCalendarById(identifier, { fresh = false } = {}) {
    if (!identifier) return Promise.reject(new Error("Calendar identifier is required"));
    const actualId = extractIdFromSlug(identifier);
    return cachedFetch(calendarKey(actualId), () => fetchCalendar(identifier, actualId, fresh), { fresh });
  },

  /** Session đã tải sẵn (đồng bộ) để hiển thị ngay frame đầu, hoặc undefined. */
  peekCalendar(identifier) {
    if (!identifier) return undefined;
    return peekCached(calendarKey(extractIdFromSlug(identifier)));
  },

  async createCalendar(groupId, payload) {
    const actualGroupId = groupId ? extractIdFromSlug(groupId) : null;
    return await http.post("/sessions", {
      groupId: actualGroupId || groupId,
      title: payload.title,
      description: payload.description || "",
      tag: payload.tag || "CÔNG VIỆC & HỌC TẬP",
      tagColor: payload.tagColor || "primary",
      dateRange: payload.dateRange,
      scheduledTime: payload.scheduledTime || "Flexible Window",
      location: payload.location || "Quán Cafe / Trực tuyến",
    });
  },

  async getSessionById(id) {
    if (!id) return null;
    const session = await http.get(`/sessions/${id}`).catch(() => null);
    if (!session) return null;
    const metrics = calculateSessionMetrics(session, []);
    return {
      ...session,
      respondedCount: session.respondedCount ?? metrics.respondedCount,
      quorumPercent: session.quorumPercent ?? metrics.quorumPercent,
    };
  },

  /** Lead chốt lịch: { date: "YYYY-MM-DD", startMinutes, endMinutes, note } */
  async finalizeSession(sessionId, payload) {
    return await http.post(`/sessions/${sessionId}/finalize`, payload);
  },

  async unfinalizeSession(sessionId) {
    return await http.post(`/sessions/${sessionId}/unfinalize`, {});
  },

  /** Tải file Excel lịch của session; trả về { blob, fileName } */
  async exportScheduleXlsx(sessionId) {
    return await http.get(`/sessions/${sessionId}/export.xlsx`, { responseType: "blob" });
  },

  async deleteCalendar(id) {
    return await http.del(`/sessions/${id}`);
  },
};

export default sessionService;
