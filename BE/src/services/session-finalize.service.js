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

    const rows = await AvailabilityModel.findForSchedule(session.id);
    if (!DATE_PATTERN.test(date) || !isWindowSelected(rows, date, startMinutes, endMinutes)) {
      throw AppError.badRequest(
        "Khung giờ chốt phải nằm trong các giờ mà nhóm đã chọn",
        ErrorCodes.INVALID_FINAL_SLOT,
      );
    }

    const updated = await SessionModel.finalize(session.id, { date, startMinutes, endMinutes, note, finalizedBy: actorId });
    if (!updated) throw AppError.conflict("Phiên này đã được chốt", ErrorCodes.SESSION_FINALIZED);

    const fresh = await SessionModel.findById(session.id);
    RealtimeService.broadcast(`session:${session.id}`, "SESSION_FINALIZED", { sessionId: session.id });

    const email = await this.#notifyFinalized(fresh, { date, startMinutes, endMinutes, note });
    return { session: toPublicSession(fresh), email };
  }

  async #notifyFinalized(session, { date, startMinutes, endMinutes, note }) {
    const contacts = await SessionModel.findGroupContacts(session.group_id);
    const sessionUrl = `${process.env.CLIENT_ORIGIN || "http://localhost:5173"}/groups/${session.group_id}/matrix/${session.slug}`;
    const whenLabel = `${formatDateLabel(date)}, ${formatRange(startMinutes, endMinutes)}`;

    const results = await Promise.allSettled(
      contacts.map((c) =>
        EmailService.sendSessionFinalized({
          email: c.email,
          sessionTitle: session.title,
          whenLabel,
          note,
          sessionUrl,
        }),
      ),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    return { total: contacts.length, sent: contacts.length - failed, failed };
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
