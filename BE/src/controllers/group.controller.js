import { sendSuccess, sendCreated } from "./response.controller.js";
import GroupService from "../services/group.service.js";
import GroupMemberService from "../services/group-member.service.js";

const groupService = new GroupService();
const groupMemberService = new GroupMemberService();

/**
 * GroupController - HTTP Layer tiếp nhận request và trả response cho Module Nhóm
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Tiếp nhận input HTTP từ Route
 *   - Gọi GroupService và GroupMemberService tương ứng
 *   - Gửi response chuẩn hóa qua response.controller
 *   - Controller action ngắn gọn từ 2-5 dòng code, tự động chuyển lỗi
 */
class GroupController {
  /**
   * POST /api/groups - Tạo nhóm mới
   */
  async createGroup(req, res) {
    const result = await groupService.createGroup(req.user.id, req.body);
    return sendCreated(res, result, "Tạo nhóm thành công");
  }

  /**
   * GET /api/groups - Lấy danh sách nhóm của người dùng
   */
  async getUserGroups(req, res) {
    const groups = await groupService.getUserGroups(req.user.id);
    return sendSuccess(res, groups, "Lấy danh sách nhóm thành công");
  }

  /**
   * GET /api/groups/:id - Lấy chi tiết thông tin nhóm
   */
  async getGroupDetail(req, res) {
    const group = await groupService.getGroupDetail(req.params.id, req.user.id);
    return sendSuccess(res, group, "Lấy chi tiết nhóm thành công");
  }

  /**
   * PATCH /api/groups/:id - Cập nhật thông tin nhóm (Lead/Owner)
   */
  async updateGroup(req, res) {
    const updated = await groupService.updateGroup(req.params.id, req.user.id, req.body);
    return sendSuccess(res, updated, "Cập nhật nhóm thành công");
  }

  /**
   * DELETE /api/groups/:id - Xóa nhóm (Chỉ Owner)
   */
  async deleteGroup(req, res) {
    const result = await groupService.deleteGroup(req.params.id, req.user.id);
    return sendSuccess(res, result, "Xóa nhóm thành công");
  }

  /**
   * GET /api/groups/:id/members - Lấy danh sách thành viên trong nhóm
   */
  async getMembers(req, res) {
    const members = await groupMemberService.getMembers(req.params.id, req.user.id);
    return sendSuccess(res, members, "Lấy danh sách thành viên thành công");
  }

  /**
   * POST /api/groups/:id/members - Thêm thành viên vào nhóm (Lead/Owner)
   */
  async addMember(req, res) {
    const member = await groupMemberService.addMember(req.params.id, req.user.id, req.body);
    return sendCreated(res, member, "Thêm thành viên vào nhóm thành công");
  }

  /** PATCH /api/groups/:id/members/:userId/role - Nâng member lên lead */
  async promoteMember(req, res) {
    const member = await groupMemberService.promoteToLead(req.params.id, req.user.id, req.params.userId);
    return sendSuccess(res, member, "Đã nâng thành viên lên Lead");
  }

  /**
   * DELETE /api/groups/:id/members/:userId - Xóa thành viên hoặc Rời nhóm
   */
  async removeMember(req, res) {
    const result = await groupMemberService.removeMember(
      req.params.id,
      req.user.id,
      req.params.userId
    );
    return sendSuccess(res, result, result.message);
  }
}

export default GroupController;
