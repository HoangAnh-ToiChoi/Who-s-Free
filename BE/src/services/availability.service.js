import AvailabilityModel from "../models/availability.model.js";
import GroupMemberModel from "../models/group-member.model.js";
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

  /**
   * Lịch rảnh của MỌI thành viên nhóm (người chưa nhập lịch có slots rỗng) — để màn Lead hiện đủ thành viên.
   * Hai truy vấn nhẹ chạy song song (thành viên nhóm + slot của phiên) rồi ghép bằng code; slot của người đã rời nhóm bị bỏ.
   */
  async getSessionAvailabilities(sessionId, userId, roleFilter = "all") {
    requireSessionAndUser(sessionId, userId);
    const { session } = await requireSessionMember(sessionId, userId);
    const [memberRows, slotRows] = await Promise.all([
      GroupMemberModel.getGroupMembers(session.group_id),
      AvailabilityModel.findAllBySession(session.id),
    ]);

    const byUser = new Map(
      memberRows.map((m) => [
        m.user_id,
        { userId: m.user_id, memberName: m.full_name, role: m.role, groupRole: m.group_role, avatarUrl: m.avatar_url, slots: [] },
      ])
    );
    for (const slot of slotRows) byUser.get(slot.user_id)?.slots.push(slot);

    let members = Array.from(byUser.values());
    if (roleFilter && roleFilter !== "all") {
      members = members.filter((m) => m.groupRole === roleFilter);
    }

    return members.map(toPublicMemberAvailability);
  }
}

export const availabilityService = new AvailabilityService();
export default availabilityService;
