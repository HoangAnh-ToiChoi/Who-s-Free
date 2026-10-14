import BaseController from "./BaseController.js";
import sessionService from "../services/session.service.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * SessionController - Điều phối HTTP Request cho Sessions
 */
class SessionController extends BaseController {
  getSessions = asyncHandler(async (req, res) => {
    const { groupId, slug } = req.query;
    const sessions = await sessionService.getSessions({ groupId, slug });
    return this.sendSuccess(res, sessions, "Lấy danh sách phiên khảo sát thành công");
  });

  getSessionById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const session = await sessionService.getSessionById(id);
    return this.sendSuccess(res, session, "Lấy thông tin phiên khảo sát thành công");
  });

  createSession = asyncHandler(async (req, res) => {
    const session = await sessionService.createSession(req.body, req.user?.id);
    return this.sendCreated(res, session, "Tạo phiên khảo sát mới thành công");
  });

  deleteSession = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await sessionService.deleteSession(id, req.user?.id);
    return this.sendSuccess(res, result, "Xóa phiên khảo sát thành công");
  });
}

export const sessionController = new SessionController();
export default sessionController;
