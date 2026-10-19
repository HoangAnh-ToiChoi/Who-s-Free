import SessionModel from "../models/session.model.js";
import GroupMemberModel from "../models/group-member.model.js";
import AppError from "../utils/AppError.js";
import { ErrorCodes } from "../constants/errorCodes.js";
import { toPublicSession } from "../utils/mappers/session.mapper.js";

class SessionService {
  async getSessions(filters = {}) {
    return (await SessionModel.findAll(filters)).map(toPublicSession);
  }

  async getSessionById(id) {
    if (!id) throw AppError.badRequest("Mã phiên không được để trống", ErrorCodes.SESSION_ID_REQUIRED);
    const session = await SessionModel.findById(id);
    if (!session) throw AppError.notFound("Không tìm thấy phiên khảo sát", ErrorCodes.SESSION_NOT_FOUND);
    return toPublicSession(session);
  }

  async createSession(payload, actorId) {
    if (!payload?.title) {
      throw AppError.badRequest("Tiêu đề phiên khảo sát là bắt buộc", ErrorCodes.SESSION_TITLE_REQUIRED);
    }
    if (!payload?.groupId) {
      throw AppError.badRequest("groupId là bắt buộc khi tạo phiên", ErrorCodes.GROUP_ID_REQUIRED);
    }
    const created = await SessionModel.create({ ...payload, createdBy: actorId });
    const withMetrics = await SessionModel.findById(created.id);
    return toPublicSession(withMetrics ?? created);
  }

  async deleteSession(id, actorId) {
    if (!id) throw AppError.badRequest("Mã phiên không được để trống", ErrorCodes.SESSION_ID_REQUIRED);
    const session = await SessionModel.findById(id);
    if (!session) throw AppError.notFound("Không tìm thấy phiên khảo sát", ErrorCodes.SESSION_NOT_FOUND);

    if (session.created_by && actorId && session.created_by !== actorId) {
      const groupId = session.group_id;
      if (groupId) {
        const member = await GroupMemberModel.findMember(groupId, actorId).catch(() => null);
        const isLeadOrOwner = member?.role === "owner" || member?.role === "lead";
        if (!isLeadOrOwner) throw AppError.forbidden("Bạn không có quyền xóa phiên này", ErrorCodes.FORBIDDEN);
      } else {
        throw AppError.forbidden("Bạn không có quyền xóa phiên này", ErrorCodes.FORBIDDEN);
      }
    }

    const deleted = await SessionModel.delete(id);
    if (!deleted) throw AppError.notFound("Không tìm thấy phiên cần xóa", ErrorCodes.SESSION_NOT_FOUND);
    return { id, deleted: true };
  }
}

export const sessionService = new SessionService();
export default sessionService;
