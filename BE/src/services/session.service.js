import SessionModel from "../models/session.model.js";
import GroupMemberModel from "../models/group-member.model.js";
import AppError from "../utils/AppError.js";
import { toPublicSession } from "../utils/mappers/session.mapper.js";

/**
 * SessionService - Xử lý nghiệp vụ Lịch trình & Phiên khảo sát (Sessions)
 */
class SessionService {
  async getSessions(filters = {}) {
    return (await SessionModel.findAll(filters)).map(toPublicSession);
  }

  async getSessionById(id) {
    if (!id) {
      throw AppError.badRequest("Mã phiên khảo sát không được để trống", "SESSION_ID_REQUIRED");
    }
    const session = await SessionModel.findById(id);
    if (!session) {
      throw AppError.notFound("Không tìm thấy phiên khảo sát", "SESSION_NOT_FOUND");
    }
    return toPublicSession(session);
  }

  async createSession(payload, actorId) {
    if (!payload?.title) {
      throw AppError.badRequest("Tiêu đề phiên khảo sát là bắt buộc", "SESSION_TITLE_REQUIRED");
    }
    const sessionData = {
      ...payload,
      createdBy: actorId || payload.createdBy || null,
    };
    return toPublicSession(await SessionModel.create(sessionData));
  }

  async deleteSession(id, actorId) {
    if (!id) {
      throw AppError.badRequest("Mã phiên khảo sát không được để trống", "SESSION_ID_REQUIRED");
    }
    const session = await SessionModel.findById(id);
    if (!session) {
      throw AppError.notFound("Không tìm thấy phiên khảo sát cần xóa", "SESSION_NOT_FOUND");
    }

    // Kiểm tra quyền sở hữu hoặc quyền Lead/Owner của nhóm
    if (session.createdBy && actorId && session.createdBy !== actorId) {
      if (session.groupId) {
        const member = await GroupMemberModel.findMember(session.groupId, actorId).catch(() => null);
        const isLeadOrOwner = member?.role === "owner" || member?.role === "lead";
        if (!isLeadOrOwner) {
          throw AppError.forbidden("Bạn không có quyền xóa phiên khảo sát này", "FORBIDDEN");
        }
      } else {
        throw AppError.forbidden("Bạn không có quyền xóa phiên khảo sát này", "FORBIDDEN");
      }
    }

    const deleted = await SessionModel.delete(id);
    if (!deleted) {
      throw AppError.notFound("Không tìm thấy phiên khảo sát cần xóa", "SESSION_NOT_FOUND");
    }
    return { id, deleted: true };
  }
}

export const sessionService = new SessionService();
export default sessionService;
