import BaseController from "./BaseController.js";
import availabilityService from "../services/availability.service.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * AvailabilityController - Điều phối HTTP Request cho Availabilities
 */
class AvailabilityController extends BaseController {
  getAvailabilities = asyncHandler(async (req, res) => {
    const { sessionId, memberId } = req.query;
    const list = await availabilityService.getAvailabilities({ sessionId, memberId });
    return this.sendSuccess(res, list, "Lấy danh sách khung giờ rảnh thành công");
  });

  getAvailabilityById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const item = await availabilityService.getAvailabilityById(id);
    return this.sendSuccess(res, item, "Lấy chi tiết khung giờ rảnh thành công");
  });

  createAvailability = asyncHandler(async (req, res) => {
    const created = await availabilityService.createAvailability(req.body, req.user?.id);
    return this.sendCreated(res, created, "Lưu khung giờ rảnh thành công");
  });

  updateAvailability = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updated = await availabilityService.updateAvailability(id, req.body, req.user?.id);
    return this.sendSuccess(res, updated, "Cập nhật khung giờ rảnh thành công");
  });
}

export const availabilityController = new AvailabilityController();
export default availabilityController;
