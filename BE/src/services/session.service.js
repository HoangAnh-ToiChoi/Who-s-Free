import SessionModel from "../models/session.model.js";
import AppError from "../utils/AppError.js";

/**
 * SessionService - Xử lý nghiệp vụ Lịch trình & Phiên khảo sát (Sessions)
 */
class SessionService {
  async getSessions(filters = {}) {
    return await SessionModel.findAll(filters);
  }

  async getSessionById(id) {
    if (!id) {
      throw AppError.badRequest("Mã phiên khảo sát không được để trống", "SESSION_ID_REQUIRED");
    }
    const session = await SessionModel.findById(id);
    if (!session) {
      throw AppError.notFound("Không tìm thấy phiên khảo sát", "SESSION_NOT_FOUND");
    }
    return session;
  }

  async createSession(payload) {
    if (!payload?.title) {
      throw AppError.badRequest("Tiêu đề phiên khảo sát là bắt buộc", "SESSION_TITLE_REQUIRED");
    }
    return await SessionModel.create(payload);
  }

  async deleteSession(id) {
    if (!id) {
      throw AppError.badRequest("Mã phiên khảo sát không được để trống", "SESSION_ID_REQUIRED");
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
