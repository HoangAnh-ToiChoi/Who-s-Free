import AppError from "../utils/AppError.js";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
})[character]);

const SEND_FAILED_MESSAGE = "Không thể gửi email lúc này. Vui lòng thử lại sau.";

/**
 * Chọn provider qua EMAIL_PROVIDER ("resend" mặc định hoặc "brevo").
 * Trả về null nếu provider được chọn chưa đủ cấu hình.
 */
function getEmailConfig() {
  const provider = (process.env.EMAIL_PROVIDER || "resend").toLowerCase();

  if (provider === "brevo") {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    if (!apiKey || !senderEmail) return null;
    return {
      provider,
      apiKey,
      senderEmail,
      senderName: process.env.BREVO_SENDER_NAME || "Who's Free",
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return null;
  return { provider: "resend", apiKey, from };
}

/** Gọi API của provider; trả về JSON phản hồi hoặc ném AppError. */
async function deliver(config, { to, subject, text, html, label, attachments = [] }) {
  const isBrevo = config.provider === "brevo";
  const url = isBrevo ? "https://api.brevo.com/v3/smtp/email" : "https://api.resend.com/emails";
  const headers = isBrevo
    ? { "api-key": config.apiKey, "Content-Type": "application/json", accept: "application/json" }
    : { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" };
  const body = isBrevo
    ? {
        sender: { name: config.senderName, email: config.senderEmail },
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html,
        ...(attachments.length && {
          attachment: attachments.map((a) => ({ name: a.filename, content: a.content.toString("base64") })),
        }),
      }
    : {
        from: config.from,
        to: [to],
        subject,
        text,
        html,
        ...(attachments.length && {
          attachments: attachments.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })),
        }),
      };

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    console.error(`${config.provider} ${label} request failed:`, error.message);
    throw new AppError(SEND_FAILED_MESSAGE, 502, "EMAIL_SEND_FAILED");
  }

  if (!response.ok) {
    const providerError = await response.json().catch(() => null);
    console.error(`${config.provider} rejected ${label}:`, response.status, providerError?.message || "unknown error");
    if (
      !isBrevo &&
      providerError?.message?.includes("You can only send testing emails to your own email address")
    ) {
      const allowedEmail = providerError.message.match(/\((.*?)\)/)?.[1] || "hoanganh281205@gmail.com";
      throw new AppError(
        `Tài khoản Resend thử nghiệm (onboarding@resend.dev) chỉ cho phép gửi email tới địa chỉ đăng ký (${allowedEmail}). Để gửi cho người khác, bạn cần xác thực domain tại resend.com/domains.`,
        400,
        "RESEND_SANDBOX_RESTRICTION"
      );
    }
    throw new AppError(SEND_FAILED_MESSAGE, 502, "EMAIL_SEND_FAILED");
  }

  return response.json();
}

/**
 * EmailService - Gửi email thông báo và mã xác thực
 */
class EmailService {
  static async sendPasswordResetOtp({ email, otp, expiresInMinutes }) {
    const config = getEmailConfig();

    // Trong môi trường test hoặc local chưa cấu hình email: Log OTP ra console để kiểm thử
    if (!config || process.env.NODE_ENV === "test") {
      console.log(`[EmailService] Password reset OTP for ${email}: ${otp}`);
      return { id: "dev-mock-email-id" };
    }

    return deliver(config, {
      to: email,
      label: "email",
      subject: "Mã đặt lại mật khẩu Who's Free",
      text: `Mã xác thực đặt lại mật khẩu của bạn là ${otp}. Mã có hiệu lực trong ${expiresInMinutes} phút. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f172a"><h2>Đặt lại mật khẩu Who's Free</h2><p>Nhập mã xác thực dưới đây để tiếp tục:</p><p style="font-size:30px;font-weight:700;letter-spacing:8px;color:#4f46e5">${otp}</p><p>Mã có hiệu lực trong ${expiresInMinutes} phút.</p><p>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p></div>`,
    });
  }

  /**
   * Gửi email lời mời tham gia nhóm (Resend hoặc Brevo, theo EMAIL_PROVIDER)
   */
  static async sendGroupInvitation({ email, groupName, inviterName, role = "member", inviteUrl, expiresInHours = 24 }) {
    const config = getEmailConfig();

    // Trong môi trường test: log URL ra console để kiểm thử
    if (process.env.NODE_ENV === "test") {
      console.log(`[EmailService] Group invite for ${email}: ${inviteUrl}`);
      return { id: "test-mock-email-id" };
    }

    if (!config) {
      throw new AppError(
        "Dịch vụ email chưa được cấu hình đầy đủ.",
        503,
        "EMAIL_NOT_CONFIGURED"
      );
    }

    const roleLabel = role === "lead" ? "Trưởng nhóm phụ (Lead)" : "Thành viên (Member)";
    const safeGroupName = escapeHtml(groupName);
    const safeInviterName = escapeHtml(inviterName || "Một quản trị viên");
    const safeEmail = escapeHtml(email);
    const safeInviteUrl = escapeHtml(inviteUrl);
    const subject = `[Who's Free] Lời mời tham gia nhóm ${groupName}`;
    const textContent = `${inviterName || "Một thành viên"} đã mời bạn tham gia nhóm "${groupName}" với vai trò ${roleLabel}.\n\nĐể chấp nhận lời mời, vui lòng truy cập liên kết sau:\n${inviteUrl}\n\nLời mời này có hiệu lực trong vòng ${expiresInHours} giờ và chỉ dành cho địa chỉ email ${email}.\nNếu bạn không mong muốn tham gia nhóm này, bạn có thể bỏ qua email.`;

    const htmlContent = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;background-color:#ffffff;border-radius:16px;border:1px solid #e2e8f0"><div style="margin-bottom:20px"><h2 style="margin:0;color:#4f46e5;font-size:22px;font-weight:700">Who's Free</h2></div><h1 style="font-size:20px;font-weight:700;color:#1e293b;margin:0 0 16px">Lời mời tham gia nhóm</h1><p style="font-size:15px;line-height:1.6;color:#334155;margin:0 0 16px">Xin chào, <strong>${safeInviterName}</strong> đã mời bạn tham gia nhóm <strong>${safeGroupName}</strong> với vai trò <span style="background-color:#e0e7ff;color:#3730a3;padding:2px 8px;border-radius:6px;font-weight:600">${roleLabel}</span>.</p><div style="margin:28px 0;text-align:center"><a href="${safeInviteUrl}" style="background-color:#4f46e5;color:#ffffff;padding:12px 28px;border-radius:12px;font-size:14px;font-weight:600;text-decoration:none;display:inline-block">Chấp nhận lời mời</a></div><p style="font-size:13px;color:#64748b;line-height:1.5;margin:0 0 8px">Liên kết có hiệu lực trong vòng <strong>${expiresInHours} giờ</strong> và chỉ áp dụng cho tài khoản đăng ký với email <code>${safeEmail}</code>.</p><p style="font-size:12px;color:#94a3b8;word-break:break-all;margin:16px 0 0">Nếu không bấm được nút trên, hãy sao chép liên kết này vào trình duyệt:<br/><a href="${safeInviteUrl}" style="color:#4f46e5">${safeInviteUrl}</a></p></div>`;

    const result = await deliver(config, {
      to: email,
      label: "invitation email",
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log(`\n📨 [INVITATION SENT SUCCESSFULLY]: Email gửi tới ${email}\n🔗 [INVITE LINK]: ${inviteUrl}\n`);
    return result;
  }

  /**
   * Gửi thông báo lịch đã chốt cho một thành viên (chỉ thông báo + link, không đính kèm file).
   */
  static async sendSessionFinalized({ email, sessionTitle, whenLabel, note, sessionUrl }) {
    const config = getEmailConfig();

    if (process.env.NODE_ENV === "test") {
      console.log(`[EmailService] Session finalized for ${email}: ${whenLabel}`);
      return { id: "test-mock-email-id" };
    }
    if (!config) {
      throw new AppError("Dịch vụ email chưa được cấu hình đầy đủ.", 503, "EMAIL_NOT_CONFIGURED");
    }

    const safeTitle = escapeHtml(sessionTitle);
    const safeWhen = escapeHtml(whenLabel);
    const safeUrl = escapeHtml(sessionUrl);
    const noteText = note ? `

Ghi chú: ${note}` : "";
    const noteHtml = note
      ? `<p style="font-size:14px;color:#b91c1c;margin:0 0 16px"><strong>Lưu ý:</strong> ${escapeHtml(note)}</p>`
      : "";

    return deliver(config, {
      to: email,
      label: "finalized email",
      subject: `[Who's Free] Đã chốt lịch: ${sessionTitle}`,
      text: `Lịch "${sessionTitle}" đã được chốt vào ${whenLabel}.${noteText}

Xem chi tiết: ${sessionUrl}`,
      html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;border:1px solid #e2e8f0;border-radius:16px"><h2 style="margin:0 0 16px;color:#4f46e5">Who's Free</h2><h1 style="font-size:20px;margin:0 0 12px">Lịch đã được chốt</h1><p style="font-size:15px;line-height:1.6;color:#334155;margin:0 0 12px">Phiên <strong>${safeTitle}</strong> đã được chốt vào:</p><p style="font-size:18px;font-weight:700;color:#166534;background:#dcfce7;padding:12px 16px;border-radius:12px;margin:0 0 16px">${safeWhen}</p>${noteHtml}<div style="margin:24px 0;text-align:center"><a href="${safeUrl}" style="background:#4f46e5;color:#fff;padding:12px 28px;border-radius:12px;font-size:14px;font-weight:600;text-decoration:none;display:inline-block">Xem lịch đã chốt</a></div></div>`,
    });
  }
}

export default EmailService;
