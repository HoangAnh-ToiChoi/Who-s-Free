import http from "~/utils/http";
import { mockGroups } from "~/data/mockData";

// Local in-memory store for mock development so created items persist during user session
let groupsStore = [...mockGroups];

let pendingInvitesStore = [
  {
    id: "inv-1",
    groupId: "ws-1",
    email: "k.zhang@robotics.edu",
    role: "Member",
    invitedAt: "2h ago",
    status: "pending",
  },
  {
    id: "inv-2",
    groupId: "ws-1",
    email: "m.alvarez@robotics.edu",
    role: "Member",
    invitedAt: "1d ago",
    status: "pending",
  },
];

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

  /**
   * Lấy thông tin link mời và danh sách pending invites của nhóm
   * @param {string|number} groupId
   * @returns {Promise<{ inviteCode: string, inviteLink: string, pendingInvites: Array }>}
   */
  async getGroupInviteInfo(groupId) {
    // === KHI CÓ API BACKEND THẬT: ===
    // return await http.get(`/api/groups/${groupId}/invitations`);

    return new Promise((resolve) => {
      setTimeout(() => {
        const group = groupsStore.find((g) => g.id === groupId);
        const code = group?.code || "ROBO-2026";
        const origin = window.location.origin;
        resolve({
          inviteCode: code,
          inviteLink: `${origin}/join/${code}`,
          pendingInvites: pendingInvitesStore.filter((i) => !groupId || i.groupId === groupId),
        });
      }, 150);
    });
  },

  /**
   * Gửi lời mời thành viên qua Email
   * @param {string|number} groupId
   * @param {Object} payload { email, role }
   * @returns {Promise<Object>}
   */
  async sendGroupInvite(groupId, { email, role = "Member" }) {
    // === KHI CÓ API BACKEND THẬT: ===
    // return await http.post(`/api/groups/${groupId}/invitations`, { email, role });

    return new Promise((resolve) => {
      setTimeout(() => {
        const newInvite = {
          id: `inv-${Date.now()}`,
          groupId,
          email,
          role,
          invitedAt: "Just now",
          status: "pending",
        };
        pendingInvitesStore = [newInvite, ...pendingInvitesStore];
        resolve(newInvite);
      }, 250);
    });
  },

  /**
   * Gửi lại lời mời cho một thành viên đang chờ xác thực
   * @param {string|number} groupId
   * @param {string} inviteId
   * @returns {Promise<Object>}
   */
  async resendGroupInvite(groupId, inviteId) {
    // === KHI CÓ API BACKEND THẬT: ===
    // return await http.post(`/api/groups/${groupId}/invitations/${inviteId}/resend`);

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, inviteId });
      }, 200);
    });
  },
};

export default groupService;
