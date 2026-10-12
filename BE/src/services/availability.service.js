import AvailabilityModel from "../models/availability.model.js";
import AppError from "../utils/AppError.js";

/**
 * AvailabilityService - Xử lý nghiệp vụ khung giờ rảnh của thành viên (Availability Slots)
 */
class AvailabilityService {
  async getAvailabilities(filters = {}) {
    return await AvailabilityModel.findAll(filters);
  }

  async getAvailabilityById(id) {
    if (!id) {
      throw AppError.badRequest("ID availability là bắt buộc", "AVAILABILITY_ID_REQUIRED");
    }
    const record = await AvailabilityModel.findById(id);
    if (!record) {
      throw AppError.notFound("Không tìm thấy khung giờ rảnh", "AVAILABILITY_NOT_FOUND");
    }
    return record;
  }

  async createAvailability(payload) {
    if (!payload?.sessionId) {
      throw AppError.badRequest("Mã phiên (sessionId) là bắt buộc", "SESSION_ID_REQUIRED");
    }
    return await AvailabilityModel.create(payload);
  }

  async updateAvailability(id, payload) {
    if (!id) {
      throw AppError.badRequest("ID availability là bắt buộc", "AVAILABILITY_ID_REQUIRED");
    }
    const updated = await AvailabilityModel.update(id, payload);
    if (!updated) {
      throw AppError.notFound("Không tìm thấy khung giờ rảnh để cập nhật", "AVAILABILITY_NOT_FOUND");
    }
    return updated;
  }
}

export const availabilityService = new AvailabilityService();
export default availabilityService;
