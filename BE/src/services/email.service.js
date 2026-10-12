import AppError from "../utils/AppError.js";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
})[character]);

/**
 * EmailService - Gửi email thông báo và mã xác thực
 */
class EmailService {
  static async sendPasswordResetOtp({ email, otp, expiresInMinutes }) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;

    // Trong môi trường test hoặc local chưa cấu hình Resend: Log OTP ra console để kiểm thử
    if (!apiKey || !from || process.env.NODE_ENV === "test") {
      console.log(`[EmailService] Password reset OTP for ${email}: ${otp}`);
      return { id: "dev-mock-email-id" };
    }

    let response;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject: "Mã đặt lại mật khẩu Who's Free",
          text: `Mã xác thực đặt lại mật khẩu của bạn là ${otp}. Mã có hiệu lực trong ${expiresInMinutes} phút. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.`,
          html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f172a"><h2>Đặt lại mật khẩu Who's Free</h2><p>Nhập mã xác thực dưới đây để tiếp tục:</p><p style="font-size:30px;font-weight:700;letter-spacing:8px;color:#4f46e5">${otp}</p><p>Mã có hiệu lực trong ${expiresInMinutes} phút.</p><p>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p></div>`,
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch (error) {
      console.error("Resend request failed:", error.message);
      throw new AppError("Không thể gửi email lúc này. Vui lòng thử lại sau.", 502, "EMAIL_SEND_FAILED");
    }

    if (!response.ok) {
      const providerError = await response.json().catch(() => null);
      console.error("Resend rejected email:", response.status, providerError?.message || "unknown error");
      throw new AppError("Không thể gửi email lúc này. Vui lòng thử lại sau.", 502, "EMAIL_SEND_FAILED");
    }

    return response.json();
  }

  /**
   * Gửi email lời mời tham gia nhóm qua Resend API
   */
  static async sendGroupInvitation({ email, groupName, inviterName, role = "member", inviteUrl, expiresInHours = 24 }) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;

    // Trong môi trường test: log URL ra console để kiểm thử
    if (process.env.NODE_ENV === "test") {
      console.log(`[EmailService] Group invite for ${email}: ${inviteUrl}`);
      return { id: "test-mock-email-id" };
    }

    if (!apiKey || !from) {
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

    let response;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject,
          text: textContent,
          html: htmlContent,
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch (error) {
      console.error("Resend invitation request failed:", error.message);
      throw new AppError("Không thể gửi email lúc này. Vui lòng thử lại sau.", 502, "EMAIL_SEND_FAILED");
    }

    if (!response.ok) {
      const providerError = await response.json().catch(() => null);
      console.error("Resend rejected invitation email:", response.status, providerError?.message || "unknown error");
      if (providerError?.message && providerError.message.includes("You can only send testing emails to your own email address")) {
        const allowedEmail = providerError.message.match(/\((.*?)\)/)?.[1] || "hoanganh281205@gmail.com";
        throw new AppError(
          `Tài khoản Resend thử nghiệm (onboarding@resend.dev) chỉ cho phép gửi email tới địa chỉ đăng ký (${allowedEmail}). Để gửi cho người khác, bạn cần xác thực domain tại resend.com/domains.`,
          400,
          "RESEND_SANDBOX_RESTRICTION"
        );
      }
      throw new AppError("Không thể gửi email lúc này. Vui lòng thử lại sau.", 502, "EMAIL_SEND_FAILED");
    }

    console.log(`\n📨 [INVITATION SENT SUCCESSFULLY]: Email gửi tới ${email}\n🔗 [INVITE LINK]: ${inviteUrl}\n`);
    return response.json();
  }
}

export default EmailService;
