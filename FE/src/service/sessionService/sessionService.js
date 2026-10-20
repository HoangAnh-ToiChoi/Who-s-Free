import http from "~/utils/http";
import { slugify, generateRandomId, extractIdFromSlug } from "~/utils/slugify";
import { calculateSessionMetrics } from "~/utils/matrixCalculations";

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

  async getCalendarById(identifier) {
    if (!identifier) throw new Error("Calendar identifier is required");
    const actualId = extractIdFromSlug(identifier);
    let session = await http.get(`/sessions/${actualId}`).catch(() => null);
    if (!session && actualId !== identifier) {
      session = await http.get(`/sessions/${identifier}`).catch(() => null);
    }
    if (!session) {
      const list = await http.get(`/sessions?slug=${identifier}`).catch(() => []);
      session = list?.[0];
    }
    if (!session) throw new Error("Calendar session not found");

    const avails = await http.get(`/sessions/${session.id}/availabilities`).catch(() => []);
    const safeAvails = Array.isArray(avails) ? avails : [];
    const metrics = calculateSessionMetrics(session, safeAvails);
    return {
      ...session,
      ...metrics,
      respondedCount: session.respondedCount ?? metrics.respondedCount,
      quorumPercent: session.quorumPercent ?? metrics.quorumPercent,
    };
  },

  async createCalendar(groupId, payload) {
    const actualGroupId = groupId ? extractIdFromSlug(groupId) : null;
    const randomId = generateRandomId(6);
    const newId = `sess-${randomId}`;
    const baseSlug = slugify(payload.title) || `session-${randomId}`;
    const slug = `${baseSlug}--${newId}`;
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newSession = {
      id: newId,
      slug,
      groupId: actualGroupId || groupId,
      refCode: `Ref #${randomHex}`,
      title: payload.title,
      description: payload.description || "",
      tag: payload.tag || "CÔNG VIỆC & HỌC TẬP",
      tagColor: payload.tagColor || "primary",
      dateRange: payload.dateRange,
      scheduledTime: payload.scheduledTime || "Flexible Window",
      location: payload.location || "Quán Cafe / Trực tuyến",
      totalMembers: 3,
      respondedCount: 0,
      quorumPercent: 0,
      highestOverlapText: "Waiting for responses - 3 pending",
      sparkline: [20, 20, 20, 20, 20],
      status: "active_poll",
    };

    const created = await http.post("/sessions", newSession);

    if (actualGroupId) {
      http
        .get(`/groups/${actualGroupId}`)
        .then((group) => {
          const currentCount = group?.activeSessionsCount || 0;
          return http.patch(`/groups/${actualGroupId}`, {
            activeSessionsCount: currentCount + 1,
          });
        })
        .catch(() => {});
    }

    return created;
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

  async deleteCalendar(id) {
    return await http.del(`/sessions/${id}`);
  },
};

export default sessionService;
