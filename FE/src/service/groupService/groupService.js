import http from "~/utils/http";
import { mockGroups } from "~/data/mockData";

// Local in-memory store for mock development so created items persist during user session
let groupsStore = [...mockGroups];

/**
 * Service quản lý các API liên quan đến Groups / Workspaces.
 * Hiện tại đang chạy trên Mock Data để phục vụ UI.
 * Khi Backend sẵn sàng, chỉ cần uncomment các lệnh gọi `http` tương ứng.
 */
export const groupService = {
  /**
   * Lấy danh sách groups (hỗ trợ lọc/search nếu có)
   * @param {Object} params - query params { search, filter }
   * @returns {Promise<Array>} Danh sách groups
   */
  async getGroups(params = {}) {
    // === KHI CÓ API BACKEND THẬT: ===
    // return await http.get("/api/groups", { params });

    // === HIỆN TẠI VỚI MOCK DATA: ===
    return new Promise((resolve) => {
      setTimeout(() => {
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

        resolve(result);
      }, 300); // Giả lập độ trễ mạng thực tế
    });
  },

  /**
   * Lấy chi tiết một group theo ID
   * @param {string|number} id
   * @returns {Promise<Object>}
   */
  async getGroupById(id) {
    // === KHI CÓ API BACKEND THẬT: ===
    // return await http.get(`/api/groups/${id}`);

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const found = groupsStore.find((g) => g.id === id);
        if (found) resolve(found);
        else reject(new Error("Group not found"));
      }, 200);
    });
  },

  /**
   * Tạo mới một group
   * @param {Object} payload - { name: string, capacity: number, description?: string }
   * @returns {Promise<Object>} Group vừa tạo
   */
  async createGroup(payload) {
    // === KHI CÓ API BACKEND THẬT: ===
    // return await http.post("/api/groups", payload);

    return new Promise((resolve) => {
      setTimeout(() => {
        const newGroup = {
          id: `ws-${Date.now()}`,
          name: payload.name,
          description:
            payload.description ||
            "Newly created group workspace. CalDAV & ICS sync active.",
          icon: "Bot",
          color: "indigo",
          role: "Owner",
          memberCount: 1,
          capacity: parseInt(payload.capacity, 10) || 10,
          leadAdmin: "Maya Lin (You)",
          cohort: "Fall 2026",
          activeSessionsCount: 0,
          responseRate: 100,
          avatarPreviews: [
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
          ],
        };

        groupsStore = [newGroup, ...groupsStore];
        resolve(newGroup);
      }, 400); // Giả lập mạng lúc tạo
    });
  },

  /**
   * Cập nhật thông tin group
   * @param {string|number} id
   * @param {Object} payload
   */
  async updateGroup(id, payload) {
    // === KHI CÓ API BACKEND THẬT: ===
    // return await http.put(`/api/groups/${id}`, payload);

    return new Promise((resolve) => {
      setTimeout(() => {
        groupsStore = groupsStore.map((g) =>
          g.id === id ? { ...g, ...payload } : g
        );
        resolve(groupsStore.find((g) => g.id === id));
      }, 300);
    });
  },

  /**
   * Xóa group
   * @param {string|number} id
   */
  async deleteGroup(id) {
    // === KHI CÓ API BACKEND THẬT: ===
    // return await http.del(`/api/groups/${id}`);

    return new Promise((resolve) => {
      setTimeout(() => {
        groupsStore = groupsStore.filter((g) => g.id !== id);
        resolve({ success: true, id });
      }, 300);
    });
  },
};

export default groupService;
