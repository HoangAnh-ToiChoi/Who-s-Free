import SessionModel from "../models/session.model.js";
import GroupModel from "../models/group.model.js";
import GroupMemberModel from "../models/group-member.model.js";
import AppError from "../utils/AppError.js";
import { ErrorCodes } from "../constants/errorCodes.js";
import { toPublicSession } from "../utils/mappers/session.mapper.js";
import { isLeadOrOwner } from "../utils/permissions.js";
import { requireGroupMember, requireSessionMember } from "./session-access.helpers.js";
import { getDateWindowError } from "../validations/session.validation.js";

class SessionService {
  /** groupId có thể là UUID hoặc slug nhóm. Không có groupId → [] (giữ hành vi cũ của ?slug=). */
  async getSessions({ groupId } = {}, actorId) {
    if (!groupId) return [];
    const group = await GroupModel.findByIdOrSlug(groupId);
    if (!group) throw AppError.notFound("Không tìm thấy nhóm", ErrorCodes.GROUP_NOT_FOUND);
    await requireGroupMember(group.id, actorId);
    return (await SessionModel.findAll({ groupId: group.id })).map(toPublicSession);
  }

  async getSessionById(id, actorId) {
    const { session } = await requireSessionMember(id, actorId);
    return toPublicSession(session);
  }

  async createSession(payload, actorId) {
    if (!payload?.title) {
      throw AppError.badRequest("Tiêu đề phiên khảo sát là bắt buộc", ErrorCodes.SESSION_TITLE_REQUIRED);
    }
    if (!payload?.groupId) {
      throw AppError.badRequest("groupId là bắt buộc khi tạo phiên", ErrorCodes.GROUP_ID_REQUIRED);
    }
    const dateError = getDateWindowError(payload);
    if (dateError) throw AppError.badRequest(dateError, ErrorCodes.VALIDATION_ERROR);
    const member = await requireGroupMember(payload.groupId, actorId);
    if (!isLeadOrOwner(member)) {
      throw AppError.forbidden("Chỉ trưởng nhóm hoặc chủ nhóm mới được tạo lịch trình", ErrorCodes.FORBIDDEN);
    }
    const created = await SessionModel.create({ ...payload, createdBy: actorId });
    const withMetrics = await SessionModel.findById(created.id);
    return toPublicSession(withMetrics ?? created);
  }

  /** Chỉ người tạo phiên hoặc owner/lead của nhóm được xoá; created_by NULL → chỉ owner/lead. */
  async deleteSession(id, actorId) {
    if (!id) throw AppError.badRequest("Mã phiên không được để trống", ErrorCodes.SESSION_ID_REQUIRED);
    const session = await SessionModel.findById(id);
    if (!session) throw AppError.notFound("Không tìm thấy phiên khảo sát", ErrorCodes.SESSION_NOT_FOUND);

    const isCreator = Boolean(actorId) && session.created_by === actorId;
    if (!isCreator) {
      const member = await GroupMemberModel.findMember(session.group_id, actorId);
      if (!isLeadOrOwner(member)) throw AppError.forbidden("Bạn không có quyền xóa phiên này", ErrorCodes.FORBIDDEN);
    }

    const deleted = await SessionModel.delete(id);
    if (!deleted) throw AppError.notFound("Không tìm thấy phiên cần xóa", ErrorCodes.SESSION_NOT_FOUND);
    return { id, deleted: true };
  }
}

export const sessionService = new SessionService();
export default sessionService;
