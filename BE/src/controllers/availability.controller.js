import BaseController from "./BaseController.js";
import availabilityService from "../services/availability.service.js";
import asyncHandler from "../utils/asyncHandler.js";

class AvailabilityController extends BaseController {
  getMyAvailability = asyncHandler(async (req, res) => {
    const { id: sessionId } = req.params;
    const data = await availabilityService.getMyAvailability(sessionId, req.user?.id);
    return this.sendSuccess(res, data, "Lấy lịch rảnh thành công");
  });

  saveMyAvailability = asyncHandler(async (req, res) => {
    const { id: sessionId } = req.params;
    const { slots = [] } = req.body;
    const result = await availabilityService.saveMyAvailability(sessionId, req.user?.id, slots);
    return this.sendSuccess(res, result, "Đã lưu lịch rảnh thành công");
  });

  getSessionAvailabilities = asyncHandler(async (req, res) => {
    const { id: sessionId } = req.params;
    const { roleFilter = "all" } = req.query;
    const data = await availabilityService.getSessionAvailabilities(sessionId, roleFilter);
    return this.sendSuccess(res, data, "Lấy danh sách lịch rảnh của nhóm thành công");
  });
}

export const availabilityController = new AvailabilityController();
export default availabilityController;
