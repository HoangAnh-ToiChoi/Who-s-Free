import BaseController from "./BaseController.js";
import GroupService from "../services/group.service.js";
import GroupMemberService from "../services/group-member.service.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * GroupController - HTTP Layer tiếp nhận request và trả response cho Module Nhóm
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Tiếp nhận input HTTP từ Route
 *   - Gọi GroupService và GroupMemberService tương ứng
 *   - Gửi response chuẩn hóa qua BaseController
 *   - Controller action ngắn gọn từ 2-5 dòng code, tự động chuyển lỗi nhờ asyncHandler
 */
class GroupController extends BaseController {
  constructor() {
    super();
    this.groupService = new GroupService();
    this.groupMemberService = new GroupMemberService();
  }

  /**
   * POST /api/groups - Tạo nhóm mới
   */
  createGroup = asyncHandler(async (req, res) => {
    const result = await this.groupService.createGroup(req.user.id, req.body);
    return this.sendCreated(res, result, "Tạo nhóm thành công");
  });

  /**
   * GET /api/groups - Lấy danh sách nhóm của người dùng
   */
  getUserGroups = asyncHandler(async (req, res) => {
    const groups = await this.groupService.getUserGroups(req.user.id);
    return this.sendSuccess(res, groups, "Lấy danh sách nhóm thành công");
  });

  /**
   * GET /api/groups/:id - Lấy chi tiết thông tin nhóm
   */
  getGroupDetail = asyncHandler(async (req, res) => {
    const group = await this.groupService.getGroupDetail(req.params.id, req.user.id);
    return this.sendSuccess(res, group, "Lấy chi tiết nhóm thành công");
  });

  /**
   * PATCH /api/groups/:id - Cập nhật thông tin nhóm (Lead/Owner)
   */
  updateGroup = asyncHandler(async (req, res) => {
    const updated = await this.groupService.updateGroup(req.params.id, req.user.id, req.body);
    return this.sendSuccess(res, updated, "Cập nhật nhóm thành công");
  });

  /**
   * DELETE /api/groups/:id - Xóa nhóm (Chỉ Owner)
   */
  deleteGroup = asyncHandler(async (req, res) => {
    const result = await this.groupService.deleteGroup(req.params.id, req.user.id);
    return this.sendSuccess(res, result, "Xóa nhóm thành công");
  });

  /**
   * GET /api/groups/:id/members - Lấy danh sách thành viên trong nhóm
   */
  getMembers = asyncHandler(async (req, res) => {
    const members = await this.groupMemberService.getMembers(req.params.id, req.user.id);
    return this.sendSuccess(res, members, "Lấy danh sách thành viên thành công");
  });

  /**
   * POST /api/groups/:id/members - Thêm thành viên vào nhóm (Lead/Owner)
   */
  addMember = asyncHandler(async (req, res) => {
    const member = await this.groupMemberService.addMember(req.params.id, req.user.id, req.body);
    return this.sendCreated(res, member, "Thêm thành viên vào nhóm thành công");
  });

  /**
   * DELETE /api/groups/:id/members/:userId - Xóa thành viên hoặc Rời nhóm
   */
  removeMember = asyncHandler(async (req, res) => {
    const result = await this.groupMemberService.removeMember(
      req.params.id,
      req.user.id,
      req.params.userId
    );
    return this.sendSuccess(res, result, result.message);
  });
}

export default GroupController;
