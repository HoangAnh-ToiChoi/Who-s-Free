import { sendSuccess, sendCreated } from "./response.controller.js";
import sessionService from "../services/session.service.js";
import sessionFinalizeService from "../services/session-finalize.service.js";

/**
 * SessionController - Điều phối HTTP Request cho Sessions
 */
class SessionController {
  async getSessions(req, res) {
    const sessions = await sessionService.getSessions({ groupId: req.query.groupId }, req.user?.id);
    return sendSuccess(res, sessions, "Lấy danh sách phiên khảo sát thành công");
  }

  async getSessionById(req, res) {
    const { id } = req.params;
    const session = await sessionService.getSessionById(id, req.user?.id);
    return sendSuccess(res, session, "Lấy thông tin phiên khảo sát thành công");
  }

  async createSession(req, res) {
    const session = await sessionService.createSession(req.body, req.user?.id);
    return sendCreated(res, session, "Tạo phiên khảo sát mới thành công");
  }

  async finalizeSession(req, res) {
    const result = await sessionFinalizeService.finalizeSession(req.params.id, req.user?.id, req.body);
    return sendSuccess(res, result, "Đã chốt lịch");
  }

  async startFinalizing(req, res) {
    const session = await sessionFinalizeService.startFinalizing(req.params.id, req.user?.id);
    return sendSuccess(res, session, "Đang chốt lịch");
  }

  async stopFinalizing(req, res) {
    await sessionFinalizeService.stopFinalizing(req.params.id, req.user?.id);
    return sendSuccess(res, null, "Đã đóng bảng chốt lịch");
  }

  async unfinalizeSession(req, res) {
    const session = await sessionFinalizeService.unfinalizeSession(req.params.id, req.user?.id);
    return sendSuccess(res, session, "Đã mở khoá lịch");
  }

  async exportSchedule(req, res) {
    const { buffer, fileName, mimeType } = await sessionFinalizeService.exportSchedule(req.params.id, req.user?.id);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    return res.send(buffer);
  }

  async updateSession(req, res) {
    const session = await sessionService.updateSession(req.params.id, req.user?.id, req.body);
    return sendSuccess(res, session, "Đã cập nhật phiên khảo sát");
  }

  async updateNote(req, res) {
    const session = await sessionService.updateNote(req.params.id, req.user?.id, req.body?.note);
    return sendSuccess(res, session, "Đã cập nhật ghi chú");
  }

  async deleteSession(req, res) {
    const { id } = req.params;
    const result = await sessionService.deleteSession(id, req.user?.id);
    return sendSuccess(res, result, "Xóa phiên khảo sát thành công");
  }
}

export const sessionController = new SessionController();
export default sessionController;
