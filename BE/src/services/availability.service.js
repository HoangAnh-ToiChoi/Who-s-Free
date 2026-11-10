import AvailabilityModel from "../models/availability.model.js";
import RealtimeService from "./realtime.service.js";
import AppError from "../utils/AppError.js";
import { ErrorCodes } from "../constants/errorCodes.js";
import { requireSessionMember } from "./session-access.helpers.js";
import { getSlotsValidationError, getSlotsWindowError } from "../validations/availability.validation.js";
import {
  toPublicUserAvailability,
  toPublicMemberAvailability,
} from "../utils/mappers/availability.mapper.js";

function requireSessionAndUser(sessionId, userId) {
  if (!sessionId) throw AppError.badRequest("sessionId là bắt buộc", ErrorCodes.SESSION_ID_REQUIRED);
  if (!userId) throw AppError.unauthorized("Vui lòng đăng nhập", ErrorCodes.UNAUTHORIZED);
}

function throwIfInvalid(error) {
  if (error) throw AppError.badRequest(error, ErrorCodes.VALIDATION_ERROR);
}

/**
 * 409 khi phiên đã chốt, kèm trạng thái THẬT trên server để client khớp lại ngay
 * (bỏ slot vẽ lạc quan chưa được lưu, chuyển sang màn đã chốt) thay vì chỉ báo lỗi.
 */
async function finalizedConflict(sessionId, userId) {
  const rows = await AvailabilityModel.findBySessionAndUser(sessionId, userId);
  return AppError.conflict("Lịch đã được chốt, không thể chỉnh sửa giờ rảnh", ErrorCodes.SESSION_FINALIZED, {
    status: "finalized",
    slots: toPublicUserAvailability({ sessionId, userId, slots: rows }).slots,
  });
}

class AvailabilityService {
  async getMyAvailability(sessionId, userId) {
    requireSessionAndUser(sessionId, userId);
    const slots = await AvailabilityModel.findBySessionAndUser(sessionId, userId);
    return toPublicUserAvailability({ sessionId, userId, slots });
  }

  async saveMyAvailability(sessionId, userId, slots = []) {
    requireSessionAndUser(sessionId, userId);
    throwIfInvalid(getSlotsValidationError(slots));

    const { session } = await requireSessionMember(sessionId, userId);
    if (session.status === "finalized") throw await finalizedConflict(sessionId, userId);
    throwIfInvalid(getSlotsWindowError(slots, session.start_date, session.end_date));

    const saved = await AvailabilityModel.replaceUserSlots(sessionId, userId, slots);
    // Phiên có thể vừa được chốt giữa lúc kiểm tra ở trên và lúc ghi (transaction trả về null)
    if (saved === null) throw await finalizedConflict(sessionId, userId);

    // Một thông báo cho cả lần lưu (thay cho mỗi dòng thay đổi một sự kiện postgres_changes)
    RealtimeService.broadcastSlotUpdate(sessionId, { sessionId });
    return toPublicUserAvailability({ sessionId, userId, slots: saved });
  }

  async getSessionAvailabilities(sessionId, userId, roleFilter = "all") {
    requireSessionAndUser(sessionId, userId);
    const { session } = await requireSessionMember(sessionId, userId);
    const rows = await AvailabilityModel.findAllBySession(session.id);

    const byUser = new Map();
    for (const row of rows) {
      if (!byUser.has(row.user_id)) {
        byUser.set(row.user_id, {
          userId: row.user_id,
          memberName: row.member_name,
          role: row.role,
          groupRole: row.group_role,
          avatarUrl: row.avatar_url,
          slots: [],
        });
      }
      byUser.get(row.user_id).slots.push(row);
    }

    let members = Array.from(byUser.values());
    if (roleFilter && roleFilter !== "all") {
      members = members.filter((m) => m.groupRole === roleFilter);
    }

    return members.map(toPublicMemberAvailability);
  }
}

export const availabilityService = new AvailabilityService();
export default availabilityService;
