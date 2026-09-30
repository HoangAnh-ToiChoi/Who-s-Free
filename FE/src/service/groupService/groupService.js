import http from "~/utils/http";
import { slugify } from "~/utils/slugify";

// Local in-memory cache for fallback
let groupsStore = [];

/**
 * Service quản lý các API liên quan đến Groups / Workspaces.
 * Đọc ghi trực tiếp từ REST API (db.json).
 */
export const groupService = {
  /**
   * Lấy danh sách groups (hỗ trợ lọc/search)
   * @param {Object} params - query params { search, filter }
   * @returns {Promise<Array>} Danh sách groups
   */
  async getGroups(params = {}) {
    try {
      const res = await http.get("/groups");
      let result = Array.isArray(res) ? res : [...groupsStore];

      if (params.filter === "owner") {
        result = result.filter((g) => g.role === "Owner");
      } else if (params.filter === "joined") {
        result = result.filter((g) => g.role === "Joined");
      }

      if (params.search?.trim()) {
        const q = params.search.toLowerCase();
        result = result.filter(
          (g) =>
            g.name.toLowerCase().includes(q) ||
            g.description?.toLowerCase().includes(q)
        );
      }

      return result;
    } catch {
      let result = [...groupsStore];

      if (params.filter === "owner") {
        result = result.filter((g) => g.role === "Owner");
      } else if (params.filter === "joined") {
        result = result.filter((g) => g.role === "Joined");
      }

      if (params.search?.trim()) {
        const q = params.search.toLowerCase();
        result = result.filter(
          (g) =>
            g.name.toLowerCase().includes(q) ||
            g.description?.toLowerCase().includes(q)
        );
      }

      return result;
    }
  },

  /**
   * Lấy chi tiết một group theo ID hoặc Slug
   * @param {string|number} id
   * @returns {Promise<Object>}
   */
  async getGroupById(id) {
    try {
      const res = await http.get(`/groups/${id}`).catch(async () => {
        const list = await http.get(`/groups?slug=${id}`);
        return Array.isArray(list) ? list[0] : null;
      });
      if (res) return res;
    } catch (err) {
      console.warn("API error fetching group, using store:", err);
    }

    const found = groupsStore.find((g) => g.id === id || g.slug === id);
    if (found) return found;
    throw new Error("Group not found");
  },

  /**
   * Lấy danh sách thành viên của nhóm từ db.json
   * @param {string|number} groupId
   * @returns {Promise<Array>}
   */
  async getMembers(groupId) {
    try {
      const res = await http.get("/members");
      return Array.isArray(res) ? res : [];
    } catch (err) {
      console.warn("Failed to get members:", err);
      return [];
    }
  },

  /**
   * Tạo mới một group
   * @param {Object} payload - { name: string, capacity: number, description?: string }
   * @returns {Promise<Object>} Group vừa tạo
   */
  async createGroup(payload) {
    const slug = slugify(payload.name) || `group-${Date.now()}`;
    const category = payload.category || "work";
    const color = payload.color || (category === "hangout" ? "emerald" : category === "other" ? "amber" : "indigo");
    const icon = category === "hangout" ? "Coffee" : category === "other" ? "Sparkles" : "BookOpen";
    const defaultDesc =
      category === "hangout"
        ? "Nhóm bạn thân, tụ tập cafe, ăn uống, xem phim và du lịch."
        : category === "other"
          ? "Nhóm sinh hoạt chung, chia sẻ lịch rảnh và sự kiện."
          : "Không gian làm việc nhóm, đồ án, chạy deadline và học tập.";

    const newGroup = {
      id: `ws-${Date.now()}`,
      slug,
      name: payload.name,
      category,
      description: payload.description || defaultDesc,
      icon,
      color,
      role: "Owner",
      memberCount: 1,
      capacity: parseInt(payload.capacity, 10) || 10,
      leadAdmin: "Maya Lin (You)",
      cohort: "2026",
      activeSessionsCount: 0,
      responseRate: 100,
      avatarPreviews: [
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
      ],
    };

    try {
      const res = await http.post("/groups", newGroup);
      if (res) {
        groupsStore = [res, ...groupsStore];
        return res;
      }
    } catch (err) {
      console.warn("API error creating group, using store:", err);
    }

    groupsStore = [newGroup, ...groupsStore];
    return newGroup;
  },

  /**
   * Cập nhật thông tin group
   * @param {string|number} id
   * @param {Object} payload
   */
  async updateGroup(id, payload) {
    try {
      const res = await http.patch(`/groups/${id}`, payload);
      if (res) {
        groupsStore = groupsStore.map((g) => (g.id === id ? { ...g, ...res } : g));
        return res;
      }
    } catch (err) {
      console.warn("API error updating group, using store:", err);
    }

    groupsStore = groupsStore.map((g) =>
      g.id === id ? { ...g, ...payload } : g
    );
    return groupsStore.find((g) => g.id === id);
  },

  /**
   * Xóa group
   * @param {string|number} id
   */
  async deleteGroup(id) {
    try {
      await http.del(`/groups/${id}`);
    } catch (err) {
      console.warn("API error deleting group, using store:", err);
    }

    groupsStore = groupsStore.filter((g) => g.id !== id);
    return { success: true, id };
  },

  /**
   * Lấy thông tin link mời và danh sách pending invites của nhóm từ db.json
   * @param {string|number} groupId
   * @returns {Promise<{ inviteCode: string, inviteLink: string, pendingInvites: Array }>}
   */
  async getGroupInviteInfo(groupId) {
    try {
      const [group, invites] = await Promise.all([
        this.getGroupById(groupId).catch(() => null),
        http.get(groupId ? `/invites?groupId=${groupId}` : "/invites").catch(() => []),
      ]);

      const code = group?.code || "ROBO-2026";
      const origin = window.location.origin;
      const baseUrl = import.meta.env.BASE_URL || "/";
      const cleanBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

      return {
        inviteCode: code,
        inviteLink: `${origin}${cleanBase}join/${code}`,
        pendingInvites: Array.isArray(invites) ? invites : [],
      };
    } catch (err) {
      console.warn("Failed to get invite info:", err);
      return { inviteCode: "ROBO-2026", inviteLink: "", pendingInvites: [] };
    }
  },

  /**
   * Gửi lời mời thành viên qua Email, lưu vào db.json
   * @param {string|number} groupId
   * @param {Object} payload { email, role }
   * @returns {Promise<Object>}
   */
  async sendGroupInvite(groupId, { email, role = "Member" }) {
    const newInvite = {
      id: `inv-${Date.now()}`,
      groupId,
      email,
      role,
      invitedAt: "Just now",
      status: "pending",
    };

    try {
      const res = await http.post("/invites", newInvite);
      return res || newInvite;
    } catch (err) {
      console.warn("Failed to save invite to db.json:", err);
      return newInvite;
    }
  },

  /**
   * Gửi lại lời mời cho một thành viên đang chờ xác thực
   * @param {string|number} groupId
   * @param {string} inviteId
   * @returns {Promise<Object>}
   */
  async resendGroupInvite(groupId, inviteId) {
    try {
      await http.patch(`/invites/${inviteId}`, { invitedAt: "Just now" });
    } catch (err) {
      console.warn("Failed to resend invite in db.json:", err);
    }
    return { success: true, inviteId };
  },
};

export default groupService;
