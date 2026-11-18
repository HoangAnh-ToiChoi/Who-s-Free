import { AppError } from "../controllers/errorHandle.controller.js";
import { escapeHtml, getEmailConfig, deliverBatch } from "./email-delivery.service.js";

const wrapHtml = ({ heading, body, buttonLabel, url }) =>
  `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;border:1px solid #e2e8f0;border-radius:16px"><h2 style="margin:0 0 16px;color:#4f46e5">Who's Free</h2><h1 style="font-size:20px;margin:0 0 12px">${heading}</h1><p style="font-size:15px;line-height:1.6;color:#334155;margin:0 0 12px">${body}</p><div style="margin:24px 0;text-align:center"><a href="${escapeHtml(url)}" style="background:#4f46e5;color:#fff;padding:12px 28px;border-radius:12px;font-size:14px;font-weight:600;text-decoration:none;display:inline-block">${buttonLabel}</a></div></div>`;

/** Gửi một batch tới owner/lead; trả về { total, sent, failed }. NODE_ENV=test không gọi mạng. */
function sendToLeads({ emails, label, subject, text, html }) {
  if (process.env.NODE_ENV === "test") {
    return { total: emails.length, sent: emails.length, failed: 0 };
  }
  const config = getEmailConfig();
  if (!config) throw new AppError("Dịch vụ email chưa được cấu hình đầy đủ.", 503, "EMAIL_NOT_CONFIGURED");
  return deliverBatch(config, { recipients: emails, label, subject, text, html });
}

class EmailDeadlineService {
  /** Nhắc owner/lead: ngày mai là ngày cuối của session. Chỉ nhắc, không yêu cầu điền gì. */
  static async sendDeadlineReminder({ emails, groupName, sessionTitle, endDate, sessionUrl }) {
    const safeTitle = escapeHtml(sessionTitle);
    return sendToLeads({
      emails,
      label: "deadline reminder email",
      subject: `[Who's Free] Ngày mai là ngày cuối của lịch: ${sessionTitle}`,
      text: `Lịch "${sessionTitle}" của nhóm "${groupName}" sẽ hết hạn vào ngày mai (${endDate}).\n\nXem lịch: ${sessionUrl}`,
      html: wrapHtml({
        heading: "Ngày mai là ngày cuối",
        body: `Lịch <strong>${safeTitle}</strong> của nhóm <strong>${escapeHtml(groupName)}</strong> sẽ hết hạn vào ngày mai (<strong>${escapeHtml(endDate)}</strong>).`,
        buttonLabel: "Xem lịch",
        url: sessionUrl,
      }),
    });
  }

  /** Báo owner/lead: session đã tự đóng vì quá hạn mà chưa được chốt. */
  static async sendSessionClosed({ emails, groupName, sessionTitle, sessionUrl }) {
    const safeTitle = escapeHtml(sessionTitle);
    return sendToLeads({
      emails,
      label: "session closed email",
      subject: `[Who's Free] Lịch đã đóng vì quá hạn: ${sessionTitle}`,
      text: `Lịch "${sessionTitle}" của nhóm "${groupName}" đã đóng vì quá hạn, chưa được chốt. Thành viên không thể điền thêm; trưởng nhóm vẫn có thể chốt lịch hoặc gia hạn.\n\nXem lịch: ${sessionUrl}`,
      html: wrapHtml({
        heading: "Lịch đã đóng vì quá hạn",
        body: `Lịch <strong>${safeTitle}</strong> của nhóm <strong>${escapeHtml(groupName)}</strong> đã đóng vì quá hạn, chưa được chốt. Thành viên không thể điền thêm; trưởng nhóm vẫn có thể chốt lịch hoặc gia hạn.`,
        buttonLabel: "Xem lịch",
        url: sessionUrl,
      }),
    });
  }
}

export default EmailDeadlineService;
