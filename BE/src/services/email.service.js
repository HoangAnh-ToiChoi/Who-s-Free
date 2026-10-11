import AppError from "../utils/AppError.js";

class EmailService {
  static async sendPasswordResetOtp({ email, otp, expiresInMinutes }) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;

    if (!apiKey || !from) {
      throw new AppError(
        "Dịch vụ gửi email chưa được cấu hình. Vui lòng thử lại sau.",
        503,
        "EMAIL_SERVICE_NOT_CONFIGURED"
      );
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
}

export default EmailService;
