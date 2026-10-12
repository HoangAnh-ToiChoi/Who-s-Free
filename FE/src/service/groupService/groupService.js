import { backendRequest } from "~/utils/backendApi";

/**
 * groupService - Quản lý giao tiếp dữ liệu Nhóm / Workspace trực tiếp với Backend API
 *
 * Single Source of Truth:
 *   - Dữ liệu nhóm chỉ lấy từ API backend.
 *   - Dữ liệu thành viên chỉ lấy từ API backend.
 *   - Lỗi API được trả về cho UI, không thay bằng dữ liệu mock.
 */
export const groupService = {
  /**
   * Chuẩn hóa Group Entity từ Backend API.
   */
  formatGroup(g) {
    if (!g) return null;
    const userRoleLower = String(g.userRole || g.user_role || g.role || "member").toLowerCase();
    const isOwner = userRoleLower === "owner" || g.role === "Owner";
    const parsedMemberCount = Number.parseInt(g.memberCount ?? g.member_count, 10);
    const memberCount = Number.isFinite(parsedMemberCount) ? parsedMemberCount : 0;
    const capacity = parseInt(g.capacity, 10) || 10;

    let memberPreviews = g.memberPreviews || g.member_previews || [];
    if (typeof memberPreviews === "string") {
      try {
        memberPreviews = JSON.parse(memberPreviews);
      } catch {
        memberPreviews = [];
      }
    }
    if (!Array.isArray(memberPreviews)) {
      memberPreviews = [];
    }

    const normalizedPreviews = memberPreviews.map((m) => ({
      id: m.id || m.userId || m.user_id,
      name: m.name || m.fullName || m.full_name || "",
      avatarUrl: m.avatarUrl || m.avatar_url || "",
    }));

    return {
      id: g.id,
      slug: g.slug || g.id,
      name: g.name,
      category: g.category || "work",
      description: g.description || "",
      icon: g.icon || "Users",
      color: g.color || "indigo",
      role: isOwner ? "Owner" : "Joined",
      userRole: userRoleLower,
      userGroupRole: g.userGroupRole || g.user_group_role || "core",
      memberCount,
      capacity,
      cohort: g.cohort || null,
      leadAdmin: g.leadAdmin || g.lead_admin || null,
      activeSessionsCount: g.activeSessionsCount ?? g.active_sessions_count,
      memberPreviews: normalizedPreviews,
      createdAt: g.createdAt || g.created_at || null,
      updatedAt: g.updatedAt || g.updated_at || null,
    };
  },

  /**
   * Chuẩn hóa thực thể Member từ Backend API (/api/groups/:id/members).
   */
  formatMember(m) {
    if (!m) return null;
    const userObj = m.user || {};
    const roleLower = String(m.role || "").toLowerCase();
    const groupRoleLower = String(m.groupRole || m.group_role || "").toLowerCase();

    const isLead =
      roleLower === "owner" ||
      roleLower === "lead" ||
      roleLower === "lead admin" ||
      groupRoleLower === "leadership";

    return {
      id: m.id || m.userId || m.user_id || userObj.id || m.email || userObj.email || null,
      userId: m.userId || userObj.id || m.id,
      name:
        userObj.fullName ||
        userObj.full_name ||
        m.name ||
        m.fullName ||
        (userObj.email ? userObj.email.split("@")[0] : "") ||
        (m.email ? m.email.split("@")[0] : "") ||
        "",
      email: userObj.email || m.email || "",
      avatarUrl: userObj.avatarUrl || userObj.avatar_url || m.avatarUrl || m.avatar_url || "",
      role: m.role || "member",
      groupRole: m.groupRole || m.group_role || "core",
      isLead,
      isOwner: roleLower === "owner",
    };
  },

  /**
   * Lấy danh sách groups từ Backend API (/api/groups).
   * @param {Object} params - { search, filter }
   * @returns {Promise<Array>}
   */
  async getGroups(params = {}) {
    const data = await backendRequest("/groups");
    const list = Array.isArray(data) ? data.map((group) => this.formatGroup(group)) : [];

    let result = [...list];

    if (params.filter === "owner") {
      result = result.filter((g) => g.role === "Owner");
    } else if (params.filter === "joined") {
      result = result.filter((g) => g.role === "Joined");
    }

    if (params.search?.trim()) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (g) =>
          g.name?.toLowerCase().includes(q) ||
          g.description?.toLowerCase().includes(q)
      );
    }

    return result;
  },

  /**
   * Lấy chi tiết một group theo UUID hoặc slug từ Backend API.
   * @param {string} id - Group UUID hoặc slug
   * @returns {Promise<Object>}
   */
  async getGroupById(id) {
    if (!id) throw new Error("Group ID is required");
    const group = await backendRequest(`/groups/${encodeURIComponent(id)}`);
    if (!group) throw new Error("Group not found");
    return this.formatGroup(group);
  },

  /**
   * Lấy danh sách thành viên thực tế của nhóm từ Backend API.
   * @param {string} groupId
   * @returns {Promise<Array>}
   */
  async getMembers(groupId, { signal } = {}) {
    if (!groupId) throw new Error("Group ID is required");
    const data = await backendRequest(
      `/groups/${encodeURIComponent(groupId)}/members`,
      { signal }
    );
    if (!Array.isArray(data)) {
      throw new Error("Invalid response while loading group members");
    }
    return data.map((item) => this.formatMember(item)).filter((member) => member?.id);
  },

  /**
   * Tạo mới một nhóm trực tiếp trên Backend API (POST /api/groups)
   * Đồng bộ toàn diện ID, slug và quyền sở hữu trong CSDL thực tế.
   * @param {Object} payload - { name, capacity, category, description, color }
   * @returns {Promise<Object>}
   */
  async createGroup(payload) {
    const body = {
      name: (payload.name || "").trim(),
      category: payload.category || "work",
      description: payload.description || "",
      capacity: parseInt(payload.capacity, 10) || 10,
      color: payload.color || "indigo",
      icon: payload.icon || "Users",
      cohort: payload.cohort || "2026",
    };

    const created = await backendRequest("/groups", {
      method: "POST",
      body,
    });

    return this.formatGroup(created);
  },

  /**
   * Cập nhật thông tin group qua Backend API (PATCH /api/groups/:id)
   * @param {string} id
   * @param {Object} payload
   */
  async updateGroup(id, payload) {
    const updated = await backendRequest(`/groups/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: payload,
    });
    return this.formatGroup(updated);
  },

  /**
   * Xóa group qua Backend API (DELETE /api/groups/:id)
   * @param {string} id
   */
  async deleteGroup(id) {
    return backendRequest(`/groups/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  /**
   * Lấy danh sách các lời mời đang chờ (pending) của nhóm từ Backend API
   * @param {string} groupId
   * @returns {Promise<Array>}
   */
  async getPendingInvitations(groupId) {
    if (!groupId) return [];
    const data = await backendRequest(
      `/groups/${encodeURIComponent(groupId)}/invitations`
    );
    if (!Array.isArray(data)) {
      throw new Error("Invalid response while loading pending invitations");
    }
    return data;
  },

  /**
   * Gửi lời mời thành viên qua Email (POST /api/groups/:id/invitations)
   * Tách biệt hoàn toàn khỏi API thêm thành viên trực tiếp
   * @param {string} groupId
   * @param {Object} payload { email, role }
   */
  async sendGroupInvite(groupId, { email, role = "member" }) {
    const normalizedRole = String(role).toLowerCase() === "lead" ? "lead" : "member";
    return backendRequest(`/groups/${encodeURIComponent(groupId)}/invitations`, {
      method: "POST",
      body: { email: email.trim(), role: normalizedRole },
    });
  },

  /**
   * Gửi lại lời mời (cấp hạn 24h mới và hủy link cũ)
   * @param {string} groupId
   * @param {string} invitationId
   */
  async resendGroupInvite(groupId, invitationId) {
    return backendRequest(
      `/groups/${encodeURIComponent(groupId)}/invitations/${encodeURIComponent(invitationId)}/resend`,
      { method: "POST" }
    );
  },

  /**
   * Thu hồi lời mời (DELETE /api/groups/:id/invitations/:invitationId)
   * @param {string} groupId
   * @param {string} invitationId
   */
  async revokeGroupInvite(groupId, invitationId) {
    return backendRequest(
      `/groups/${encodeURIComponent(groupId)}/invitations/${encodeURIComponent(invitationId)}`,
      { method: "DELETE" }
    );
  },
};

export default groupService;
