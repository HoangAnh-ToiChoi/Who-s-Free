import SessionModel from "../models/session.model.js";
import GroupModel from "../models/group.model.js";
import GroupMemberModel from "../models/group-member.model.js";
import AppError from "../utils/AppError.js";
import { ErrorCodes } from "../constants/errorCodes.js";
import { toPublicSession } from "../utils/mappers/session.mapper.js";
import { isLeadOrOwner } from "../utils/permissions.js";
import { requireGroupMember, requireSessionMember } from "./session-access.helpers.js";
import { getDateWindowError, getNoteError, getSessionUpdateError } from "../validations/session.validation.js";

/** Tải session (404) và chỉ cho người tạo phiên hoặc owner/lead của nhóm thao tác; created_by NULL → chỉ owner/lead. */
async function requireSessionManager(id, actorId, action) {
  if (!id) throw AppError.badRequest("Mã phiên không được để trống", ErrorCodes.SESSION_ID_REQUIRED);
  const session = await SessionModel.findById(id);
  if (!session) throw AppError.notFound("Không tìm thấy phiên khảo sát", ErrorCodes.SESSION_NOT_FOUND);
  if (actorId && session.created_by === actorId) return session;
  const member = await GroupMemberModel.findMember(session.group_id, actorId);
  if (!isLeadOrOwner(member)) throw AppError.forbidden(`Bạn không có quyền ${action} phiên này`, ErrorCodes.FORBIDDEN);
  return session;
}

class SessionService {
  /** groupId có thể là UUID hoặc slug nhóm. Không có groupId → [] (giữ hành vi cũ của ?slug=). */
  async getSessions({ groupId } = {}, actorId) {
    if (!groupId) return [];
    const group = await GroupModel.findByIdOrSlug(groupId);
    if (!group) throw AppError.notFound("Không tìm thấy nhóm", ErrorCodes.GROUP_NOT_FOUND);
    await requireGroupMember(group.id, actorId);
    return (await SessionModel.findAll({ groupId: group.id })).map(toPublicSession);
  }

  async getSessionById(id, actorId) {
    const { session } = await requireSessionMember(id, actorId);
    return toPublicSession(session);
  }

  async createSession(payload, actorId) {
    if (!payload?.title) {
      throw AppError.badRequest("Tiêu đề phiên khảo sát là bắt buộc", ErrorCodes.SESSION_TITLE_REQUIRED);
    }
    if (!payload?.groupId) {
      throw AppError.badRequest("groupId là bắt buộc khi tạo phiên", ErrorCodes.GROUP_ID_REQUIRED);
    }
    const dateError = getDateWindowError(payload);
    if (dateError) throw AppError.badRequest(dateError, ErrorCodes.VALIDATION_ERROR);
    const member = await requireGroupMember(payload.groupId, actorId);
    if (!isLeadOrOwner(member)) {
      throw AppError.forbidden("Chỉ trưởng nhóm hoặc chủ nhóm mới được tạo lịch trình", ErrorCodes.FORBIDDEN);
    }
    const created = await SessionModel.create({ ...payload, createdBy: actorId });
    const withMetrics = await SessionModel.findById(created.id);
    return toPublicSession(withMetrics ?? created);
  }

  /** Chỉ owner/lead của nhóm được sửa ghi chú phiên (hiện cho mọi thành viên ở trang ma trận). */
  async updateNote(id, actorId, note) {
    const noteError = getNoteError(note);
    if (noteError) throw AppError.badRequest(noteError, ErrorCodes.VALIDATION_ERROR);
    const { session, member } = await requireSessionMember(id, actorId);
    if (!isLeadOrOwner(member)) {
      throw AppError.forbidden("Chỉ trưởng nhóm hoặc chủ nhóm mới được sửa ghi chú", ErrorCodes.FORBIDDEN);
    }
    await SessionModel.update(session.id, { description: note.trim() });
    return toPublicSession(await SessionModel.findById(session.id));
  }

  /**
   * Sửa tên và/hoặc khoảng ngày của phiên. Đổi khoảng ngày bị chặn khi phiên đã chốt
   * hoặc khi còn slot thành viên đã nhập nằm ngoài khoảng mới (tránh mất lịch đã nhập).
   */
  async updateSession(id, actorId, payload = {}) {
    const session = await requireSessionManager(id, actorId, "sửa");
    const error = getSessionUpdateError(payload, session);
    if (error) throw AppError.badRequest(error, ErrorCodes.VALIDATION_ERROR);

    const changes = {};
    if (payload.title !== undefined) changes.title = payload.title.trim();
    const { startDate, endDate } = payload;
    const datesChanged = startDate !== undefined && (startDate !== session.start_date || endDate !== session.end_date);
    if (datesChanged) {
      if (session.status === "finalized") {
        throw AppError.conflict("Lịch đã chốt, hãy huỷ chốt trước khi đổi khoảng ngày", ErrorCodes.SESSION_FINALIZED);
      }
      const outside = await SessionModel.countSlotsOutsideWindow(session.id, startDate, endDate);
      if (outside > 0) {
        throw AppError.conflict(`Có ${outside} khung giờ thành viên đã nhập nằm ngoài khoảng ngày mới`, ErrorCodes.VALIDATION_ERROR);
      }
      const label = typeof payload.dateRange === "string" ? payload.dateRange.trim().slice(0, 150) : "";
      Object.assign(changes, { start_date: startDate, end_date: endDate, date_range: label || `${startDate} – ${endDate}` });
    }

    await SessionModel.update(session.id, changes);
    return toPublicSession(await SessionModel.findById(session.id));
  }

  async deleteSession(id, actorId) {
    const session = await requireSessionManager(id, actorId, "xóa");
    const deleted = await SessionModel.delete(session.id);
    if (!deleted) throw AppError.notFound("Không tìm thấy phiên cần xóa", ErrorCodes.SESSION_NOT_FOUND);
    return { id, deleted: true };
  }
}

export const sessionService = new SessionService();
export default sessionService;
