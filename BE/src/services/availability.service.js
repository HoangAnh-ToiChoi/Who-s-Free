import AvailabilityModel from "../models/availability.model.js";
import SessionModel from "../models/session.model.js";
import GroupMemberModel from "../models/group-member.model.js";
import AppError from "../utils/AppError.js";
import { ErrorCodes } from "../constants/errorCodes.js";
import {
  toPublicUserAvailability,
  toPublicMemberAvailability,
} from "../utils/mappers/availability.mapper.js";

// 7 ngày × 48 slot 30 phút = 336 slots tối đa
const MAX_SLOTS = 336;

function requireSessionAndUser(sessionId, userId) {
  if (!sessionId) throw AppError.badRequest("sessionId là bắt buộc", ErrorCodes.SESSION_ID_REQUIRED);
  if (!userId) throw AppError.unauthorized("Vui lòng đăng nhập", ErrorCodes.UNAUTHORIZED);
}

function validateSlots(slots) {
  if (!Array.isArray(slots)) throw AppError.badRequest("slots phải là mảng", ErrorCodes.VALIDATION_ERROR);
  if (slots.length > MAX_SLOTS) throw AppError.badRequest(`Tối đa ${MAX_SLOTS} slots mỗi lần lưu`, ErrorCodes.VALIDATION_ERROR);
}

class AvailabilityService {
  async getMyAvailability(sessionId, userId) {
    requireSessionAndUser(sessionId, userId);
    const slots = await AvailabilityModel.findBySessionAndUser(sessionId, userId);
    return toPublicUserAvailability({ sessionId, userId, slots });
  }

  async saveMyAvailability(sessionId, userId, slots = []) {
    requireSessionAndUser(sessionId, userId);
    validateSlots(slots);

    const session = await SessionModel.findById(sessionId);
    if (!session) throw AppError.notFound("Không tìm thấy phiên", ErrorCodes.SESSION_NOT_FOUND);
    const member = await GroupMemberModel.findMember(session.group_id, userId).catch(() => null);
    if (!member) throw AppError.forbidden("Bạn không phải thành viên của nhóm này", ErrorCodes.FORBIDDEN);

    await AvailabilityModel.replaceUserSlots(sessionId, userId, slots);
    const saved = await AvailabilityModel.findBySessionAndUser(sessionId, userId);
    return toPublicUserAvailability({ sessionId, userId, slots: saved });
  }

  async getSessionAvailabilities(sessionId, roleFilter = "all") {
    if (!sessionId) throw AppError.badRequest("sessionId là bắt buộc", ErrorCodes.SESSION_ID_REQUIRED);
    const rows = await AvailabilityModel.findAllBySession(sessionId);

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
