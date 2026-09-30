import http from "~/utils/http";
import { slugify } from "~/utils/slugify";
import { calculateSessionMetrics, calculateGroupMetrics } from "~/utils/matrixCalculations";

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
  async getGroupCalendars(groupId, groupSlug) {
    try {
      // Dùng query param để json-server lọc sẵn, giảm payload trả về
      const sessionPromise = groupId
        ? http.get(`/sessions?groupId=${groupId}`).then((list) => {
            // Nếu kết quả rỗng và có slug, thử tìm bằng groupSlug
            if ((!list || list.length === 0) && groupSlug) {
              return http.get(`/sessions?groupSlug=${groupSlug}`).catch(() => []);
            }
            return list;
          })
        : http.get("/sessions");

      const [sessions, allAvails] = await Promise.all([
        sessionPromise.catch(() => []),
        // Fetch availabilities song song — cần để tính metrics khi đọc
        http.get("/availabilities").catch(() => []),
      ]);

      const sessionList = Array.isArray(sessions) ? sessions : [];
      const availsList = Array.isArray(allAvails) ? allAvails : [];

      return sessionList.map((session) => {
        const sessionAvails = availsList.filter((a) => a.sessionId === session.id);
        const metrics = calculateSessionMetrics(session, sessionAvails);
        return { ...session, ...metrics };
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
    let session = await http.get(`/sessions/${identifier}`).catch(() => null);
    if (!session) {
      const list = await http.get(`/sessions?slug=${identifier}`).catch(() => []);
      session = list?.[0];
    }
    if (!session) throw new Error("Calendar session not found");

    const avails = await http.get(`/availabilities?sessionId=${session.id}`).catch(() => []);
    const metrics = calculateSessionMetrics(session, avails);
    return { ...session, ...metrics };
  },

  /**
   * Lấy danh sách availability của tất cả thành viên trong session
   * @param {string} sessionId
   */
  async getSessionAvailabilities(sessionId) {
    const list = await http.get(`/availabilities?sessionId=${sessionId}`).catch(() => []);
    return Array.isArray(list) ? list : [];
  },

  /**
   * Lấy khung giờ rảnh của một thành viên trong session
   * @param {string} sessionId
   * @param {string} memberId
   * @returns {Object|null} Record availability (bao gồm id để dùng lại khi PATCH)
   */
  async getMemberAvailability(sessionId, memberId = "mem-1") {
    const list = await http.get(`/availabilities?sessionId=${sessionId}&memberId=${memberId}`).catch(() => []);
    return list?.[0] || null;
  },

  /**
   * Lưu slots của thành viên — chỉ 1 API call duy nhất
   *
   * @param {string} sessionId
   * @param {string} memberId
   * @param {Array} slots - Danh sách slot đã cập nhật
   * @param {string|null} recordId - ID record availability đã có (từ lần load đầu).
   *   Nếu có → PATCH trực tiếp. Nếu null → POST tạo mới.
   * @returns {{ data: Object, recordId: string }} Kết quả lưu kèm recordId để cache lại
   */
  async saveMemberAvailability(sessionId, memberId = "mem-1", slots = [], recordId = null) {
    let saved;

    if (recordId) {
      // Đã tồn tại → PATCH trực tiếp, không cần GET kiểm tra
      saved = await http.patch(`/availabilities/${recordId}`, { slots });
    } else {
      // Chưa có → POST tạo mới
      const newId = `avail-${sessionId}-${memberId}`;
      saved = await http.post("/availabilities", {
        id: newId,
        sessionId,
        memberId,
        slots,
      });
    }

    // Trả về recordId để hook cache lại cho lần PATCH tiếp theo
    return { data: saved, recordId: saved?.id || recordId };
  },

  /**
   * Tạo session mới — chỉ POST session + PATCH count đơn giản
   * @param {string} groupId
   * @param {Object} payload
   * @param {string} groupSlug
   */
  async createCalendar(groupId, payload, groupSlug) {
    const slug = slugify(payload.title) || `session-${Date.now()}`;
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newSession = {
      id: `sess-${Date.now()}`,
      slug,
      groupId: groupId || "ws-1",
      groupSlug: groupSlug || undefined,
      refCode: `Ref #${randomHex}`,
      title: payload.title,
      description: payload.description || "",
      tag: payload.tag || "TECHNICAL SPRINT",
      tagColor: payload.tagColor || "secondary",
      dateRange: payload.dateRange,
      scheduledTime: payload.scheduledTime || "Flexible Window",
      location: payload.location || "Virtual / Campus Lab",
      totalMembers: 12,
      respondedCount: 0,
      quorumPercent: 0,
      highestOverlapText: "Waiting for responses - 12 pending",
      sparkline: [20, 20, 20, 20, 20],
      status: "active_poll",
    };

    // API CALL #1: Tạo session
    const created = await http.post("/sessions", newSession);

    // API CALL #2 (fire-and-forget): Cập nhật count nhóm bằng cách lấy group rồi +1
    // Không await để không block UI
    http
      .get(`/groups/${groupId}`)
      .then((group) => {
        const currentCount = group?.activeSessionsCount || 0;
        return http.patch(`/groups/${groupId}`, {
          activeSessionsCount: currentCount + 1,
        });
      })
      .catch(() => {});

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
