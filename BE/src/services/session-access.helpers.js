import SessionModel from "../models/session.model.js";
import GroupMemberModel from "../models/group-member.model.js";
import AppError from "../utils/AppError.js";
import { ErrorCodes } from "../constants/errorCodes.js";

/** Trả về bản ghi thành viên của userId trong nhóm, hoặc 403 nếu không phải thành viên. */
export async function requireGroupMember(groupId, userId) {
  const member = await GroupMemberModel.findMember(groupId, userId);
  if (!member) throw AppError.forbidden("Bạn không phải thành viên của nhóm này", ErrorCodes.FORBIDDEN);
  return member;
}

/** Tải session (404 nếu không có) và bắt buộc userId là thành viên nhóm của session đó. */
export async function requireSessionMember(sessionId, userId) {
  if (!sessionId) throw AppError.badRequest("Mã phiên không được để trống", ErrorCodes.SESSION_ID_REQUIRED);
  const session = await SessionModel.findById(sessionId);
  if (!session) throw AppError.notFound("Không tìm thấy phiên khảo sát", ErrorCodes.SESSION_NOT_FOUND);
  const member = await requireGroupMember(session.group_id, userId);
  return { session, member };
}
