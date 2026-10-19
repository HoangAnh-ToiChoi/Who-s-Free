import http from "~/utils/http";
import { slugify, generateRandomId, extractIdFromSlug } from "~/utils/slugify";
import { calculateSessionMetrics } from "~/utils/matrixCalculations";

/**
 * Service quản lý Calendars / Planning Sessions và Availability Matrix
 * Kết nối trực tiếp REST API (db.json).
 *
 * Nguyên tắc tối ưu:
 * - Metrics (respondedCount, quorumPercent, sparkline...) chỉ tính khi ĐỌC (getGroupCalendars, getCalendarById).
 * - Khi GHI (save slots, tạo session) chỉ gọi đúng 1 API call cần thiết.
 */
export const calendarService = {
  /**
   * Lấy danh sách sessions của nhóm, tự động tính toán các chỉ số thực tế
   * @param {string} groupId - ID nhóm
   * @param {string} groupSlug - Slug nhóm (fallback matching)
   */
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
   * Lấy chi tiết một session theo ID hoặc Slug
   * @param {string} identifier - ID hoặc slug
   */
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

  /**
   * Lấy danh sách availability của tất cả thành viên trong session
   * @param {string} sessionId
   */
  async getSessionAvailabilities(sessionId) {
    if (!sessionId) return [];
    const actualId = extractIdFromSlug(sessionId);
    const list = await http.get(`/sessions/${actualId}/availabilities`).catch(() => []);
    return Array.isArray(list) ? list : [];
  },

  /**
   * Lấy khung giờ rảnh của người dùng hiện tại trong session
   * @param {string} sessionId
   */
  async getMemberAvailability(sessionId) {
    if (!sessionId) return null;
    const actualId = extractIdFromSlug(sessionId);
    return await http.get(`/sessions/${actualId}/my-availability`).catch(() => null);
  },

  /**
   * Lưu slots của người dùng hiện tại trong session (Atomic Replace)
   *
   * @param {string} sessionId
   * @param {string} _memberId
   * @param {Array} slots - Danh sách slot đã cập nhật
   * @returns {{ data: Object, recordId: string }}
   */
  async saveMemberAvailability(sessionId, _memberId, slots = []) {
    const actualId = extractIdFromSlug(sessionId);
    const saved = await http.put(`/sessions/${actualId}/my-availability`, { slots });
    return { data: saved, recordId: actualId };
  },

  /**
   * Tạo session mới — chỉ POST session + PATCH count đơn giản
   * @param {string} groupId
   * @param {Object} payload
   * @param {string} groupSlug
   */
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

    // API CALL #1: Tạo session
    const created = await http.post("/sessions", newSession);

    // API CALL #2 (fire-and-forget): Cập nhật count nhóm bằng cách lấy group rồi +1
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

  /**
   * Xóa session
   * @param {string} id
   */
  async deleteCalendar(id) {
    return await http.del(`/sessions/${id}`);
  },
};

export default calendarService;
