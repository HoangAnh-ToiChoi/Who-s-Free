import { sendSuccess } from "./response.controller.js";
import availabilityService from "../services/availability.service.js";

class AvailabilityController {
  async getMyAvailability(req, res) {
    const { id: sessionId } = req.params;
    const data = await availabilityService.getMyAvailability(sessionId, req.user?.id);
    return sendSuccess(res, data, "Lấy lịch rảnh thành công");
  }

  async saveMyAvailability(req, res) {
    const { id: sessionId } = req.params;
    const { slots = [] } = req.body;
    const result = await availabilityService.saveMyAvailability(sessionId, req.user?.id, slots);
    return sendSuccess(res, result, "Đã lưu lịch rảnh thành công");
  }

  async getSessionAvailabilities(req, res) {
    const { id: sessionId } = req.params;
    const { roleFilter = "all" } = req.query;
    const data = await availabilityService.getSessionAvailabilities(sessionId, req.user?.id, roleFilter);
    return sendSuccess(res, data, "Lấy danh sách lịch rảnh của nhóm thành công");
  }
}

export const availabilityController = new AvailabilityController();
export default availabilityController;
