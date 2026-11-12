import SessionModel from "../models/session.model.js";
import AvailabilityModel from "../models/availability.model.js";
import GroupMemberModel from "../models/group-member.model.js";
import AppError from "../utils/AppError.js";
import { ErrorCodes } from "../constants/errorCodes.js";
import { toPublicSession } from "../utils/mappers/session.mapper.js";
import { isLeadOrOwner } from "../utils/permissions.js";
import { toDateString } from "../utils/date.js";
import { toSafeFileName } from "../utils/fileName.js";
import { formatDateLabel, formatRange, isWindowSelected } from "../utils/schedule.js";
import EmailService from "./email.service.js";
import RealtimeService from "./realtime.service.js";
import { buildScheduleWorkbook, XLSX_MIME } from "./schedule-export.service.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** Thời gian giữ trạng thái "đang chốt" mỗi lần trưởng nhóm mở/gia hạn (FE gia hạn mỗi 3 phút khi bảng còn mở). */
export const FINALIZING_MINUTES = 10;

/**
 * SessionFinalizeService - Chốt / mở khoá lịch và xuất Excel của một session
 *
 * Trách nhiệm duy nhất (SRP): vòng đời "chốt lịch" (kiểm tra quyền, kiểm tra khung giờ,
 * khoá chỉnh sửa, thông báo realtime + email) và dựng file Excel. CRUD session nằm ở SessionService.
 */
class SessionFinalizeService {
  /** Tải session và bắt buộc actor là owner/lead của nhóm. */
  async #requireLead(id, actorId) {
    if (!id) throw AppError.badRequest("Mã phiên không được để trống", ErrorCodes.SESSION_ID_REQUIRED);
    const session = await SessionModel.findById(id);
    if (!session) throw AppError.notFound("Không tìm thấy phiên khảo sát", ErrorCodes.SESSION_NOT_FOUND);
    const member = await GroupMemberModel.findMember(session.group_id, actorId).catch(() => null);
    if (!isLeadOrOwner(member)) {
      throw AppError.forbidden("Chỉ trưởng nhóm mới được thực hiện thao tác này", ErrorCodes.FORBIDDEN);
    }
    return session;
  }

  /** Dựng file Excel của một session (kèm khung giờ đã chốt nếu có). */
  async #buildWorkbook(session) {
    const rows = await AvailabilityModel.findForSchedule(session.id);
    const finalized = session.status === "finalized" && session.finalized_date
      ? {
          date: toDateString(session.finalized_date),
          startMinutes: session.finalized_start_minutes,
          endMinutes: session.finalized_end_minutes,
        }
      : null;
    return buildScheduleWorkbook({ title: session.title, rows, note: session.export_note, finalized });
  }

  async exportSchedule(id, actorId) {
    const session = await this.#requireLead(id, actorId);
    const buffer = await this.#buildWorkbook(session);
    return { buffer, fileName: toSafeFileName(session.title, "xlsx", "lich"), mimeType: XLSX_MIME };
  }

  /**
   * Lead chốt lịch: chọn 1 khung giờ nằm trong các giờ nhóm đã chọn, khoá chỉnh sửa và gửi mail thông báo cho cả nhóm.
   * @param {{ date: string, startMinutes: number, endMinutes: number, note?: string }} payload
   */
  async finalizeSession(id, actorId, payload = {}) {
    const session = await this.#requireLead(id, actorId);
    if (session.status === "finalized") {
      throw AppError.conflict("Phiên này đã được chốt", ErrorCodes.SESSION_FINALIZED);
    }

    const date = String(payload.date ?? "");
    const startMinutes = Number(payload.startMinutes);
    const endMinutes = Number(payload.endMinutes);
    const note = String(payload.note ?? "").trim().slice(0, 500);

    const invalidSlot = () =>
      AppError.badRequest("Khung giờ chốt phải nằm trong các giờ mà nhóm đã chọn", ErrorCodes.INVALID_FINAL_SLOT);
    if (!DATE_PATTERN.test(date)) throw invalidSlot();

    // Kiểm tra trên lịch mới nhất và ghi chốt trong cùng một lần khoá phiên (xem SessionModel.finalizeLocked)
    const result = await SessionModel.finalizeLocked(
      session.id,
      { date, startMinutes, endMinutes, note, finalizedBy: actorId },
      (rows) => isWindowSelected(rows, date, startMinutes, endMinutes),
    );
    if (result === "already_finalized") throw AppError.conflict("Phiên này đã được chốt", ErrorCodes.SESSION_FINALIZED);
    if (result === "invalid") throw invalidSlot();

    const fresh = await SessionModel.findById(session.id);
    RealtimeService.broadcast(`session:${session.id}`, "SESSION_FINALIZED", { sessionId: session.id });

    const email = await this.#notifyFinalized(fresh, { date, startMinutes, endMinutes, note });
    return { session: toPublicSession(fresh), email };
  }

  async #notifyFinalized(session, { date, startMinutes, endMinutes, note }) {
    const contacts = await SessionModel.findGroupContacts(session.group_id);
    const sessionUrl = `${process.env.CLIENT_ORIGIN || "http://localhost:5173"}/groups/${session.group_id}/matrix/${session.slug}`;
    const whenLabel = `${formatDateLabel(date)}, ${formatRange(startMinutes, endMinutes)}`;

    const emails = contacts.map((c) => c.email).filter(Boolean);
    if (emails.length === 0) return { total: 0, sent: 0, failed: 0 };
    // Một request batch cho cả nhóm thay vì mỗi thành viên một request song song (dễ dính rate limit của provider)
    return EmailService.sendSessionFinalized({ emails, sessionTitle: session.title, whenLabel, note, sessionUrl })
      .catch(() => ({ total: emails.length, sent: 0, failed: emails.length }));
  }

  /**
   * Trưởng nhóm mở bảng Chốt lịch (gọi lại định kỳ để gia hạn): thành viên khác tạm không sửa được lịch
   * trong FINALIZING_MINUTES phút. Một trưởng nhóm khác đang chốt thì báo 409.
   */
  async startFinalizing(id, actorId) {
    const session = await this.#requireLead(id, actorId);
    if (session.status === "finalized") throw AppError.conflict("Phiên này đã được chốt", ErrorCodes.SESSION_FINALIZED);
    const started = await SessionModel.startFinalizing(session.id, actorId, FINALIZING_MINUTES);
    if (!started) {
      throw AppError.conflict("Một trưởng nhóm khác đang chốt lịch này", ErrorCodes.SESSION_FINALIZING_BY_OTHER);
    }
    RealtimeService.broadcast(`session:${session.id}`, "SESSION_FINALIZING", { sessionId: session.id });
    return toPublicSession(await SessionModel.findById(session.id));
  }

  /** Trưởng nhóm đóng bảng Chốt lịch: mở lại cho thành viên sửa lịch. */
  async stopFinalizing(id, actorId) {
    const session = await this.#requireLead(id, actorId);
    if (await SessionModel.stopFinalizing(session.id, actorId)) {
      RealtimeService.broadcast(`session:${session.id}`, "SESSION_FINALIZING", { sessionId: session.id });
    }
  }

  /** Mở khoá để thành viên chỉnh sửa lại (không gửi mail). */
  async unfinalizeSession(id, actorId) {
    const session = await this.#requireLead(id, actorId);
    const updated = await SessionModel.unfinalize(session.id);
    if (!updated) throw AppError.conflict("Phiên này chưa được chốt", ErrorCodes.SESSION_NOT_FINALIZED);
    RealtimeService.broadcast(`session:${session.id}`, "SESSION_UNFINALIZED", { sessionId: session.id });
    return toPublicSession(await SessionModel.findById(session.id));
  }
}

export const sessionFinalizeService = new SessionFinalizeService();
export default sessionFinalizeService;
