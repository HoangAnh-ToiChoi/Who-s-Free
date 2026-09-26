import http from "~/utils/http";
import { mockSessions } from "~/data/mockData";

// Local in-memory store for mock development
let sessionsStore = [...mockSessions];

/**
 * Service quản lý các API liên quan đến Calendars / Planning Sessions của nhóm
 */
export const calendarService = {
  /**
   * Lấy danh sách các planning sessions / calendars của nhóm
   * @param {string|number} groupId - ID nhóm
   * @param {Object} params - Query params (nếu có)
   * @returns {Promise<Array>} Danh sách sessions
   */
  async getGroupCalendars(groupId, params = {}) {
    // === KHI CÓ API BACKEND THẬT: ===
    // return await http.get(`/api/groups/${groupId}/calendars`, { params });

    // === HIỆN TẠI VỚI MOCK DATA: ===
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([...sessionsStore]);
      }, 250);
    });
  },

  /**
   * Lấy chi tiết một calendar / session theo ID
   * @param {string|number} calendarId
   * @returns {Promise<Object>}
   */
  async getCalendarById(calendarId) {
    // === KHI CÓ API BACKEND THẬT: ===
    // return await http.get(`/api/calendars/${calendarId}`);

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const found = sessionsStore.find((s) => s.id === calendarId);
        if (found) resolve(found);
        else reject(new Error("Calendar session not found"));
      }, 200);
    });
  },

  /**
   * Tạo một calendar / planning session mới
   * @param {string|number} groupId
   * @param {Object} payload - { title, tag, dateRange, scheduledTime, location, quorumPercent }
   * @returns {Promise<Object>} Session vừa tạo
   */
  async createCalendar(groupId, payload) {
    // === KHI CÓ API BACKEND THẬT: ===
    // return await http.post(`/api/groups/${groupId}/calendars`, payload);

    return new Promise((resolve) => {
      setTimeout(() => {
        const newSession = {
          id: `sess-${Date.now()}`,
          refCode: `Ref #${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          title: payload.title,
          description:
            payload.description ||
            "Centralized availability matrix poll and calendar agenda sync.",
          tag: payload.tag || "TECHNICAL SPRINT",
          tagColor: payload.tagColor || "secondary",
          dateRange: payload.dateRange || "Next Week (Nov 01 – Nov 07, 2026)",
          scheduledTime: payload.scheduledTime || "Flexible Window",
          location: payload.location || "Virtual / Campus Lab",
          respondedCount: 1,
          totalMembers: 12,
          highestOverlapText: "New poll initialized • Collecting member availability",
          status: "active_poll",
          quorumPercent: parseInt(payload.quorumPercent, 10) || 70,
          sparkline: [20, 40, 70, 90, 40],
        };

        sessionsStore = [newSession, ...sessionsStore];
        resolve(newSession);
      }, 350);
    });
  },

  /**
   * Xóa một calendar session
   * @param {string|number} calendarId
   */
  async deleteCalendar(calendarId) {
    // === KHI CÓ API BACKEND THẬT: ===
    // return await http.del(`/api/calendars/${calendarId}`);

    return new Promise((resolve) => {
      setTimeout(() => {
        sessionsStore = sessionsStore.filter((s) => s.id !== calendarId);
        resolve({ success: true, id: calendarId });
      }, 250);
    });
  },
};

export default calendarService;
