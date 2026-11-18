import AppError from "../utils/AppError.js";

export const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
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
export function getEmailConfig() {
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
export async function deliver(config, { to, subject, text, html, label, attachments = [] }) {
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

// Resend nhận tối đa 100 email mỗi request batch; Brevo nhận tới 1000 messageVersions — dùng chung 100 cho an toàn.
const BATCH_SIZE = 100;

/**
 * Gửi CÙNG một nội dung tới nhiều người bằng API batch của provider (mỗi người nhận một email riêng,
 * không thấy địa chỉ của nhau): N người nhận = ceil(N/100) request thay vì N request.
 * Trả về { total, sent, failed } — một batch lỗi thì cả batch tính là failed.
 */
export async function deliverBatch(config, { recipients, subject, text, html, label }) {
  const chunks = [];
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) chunks.push(recipients.slice(i, i + BATCH_SIZE));

  const isBrevo = config.provider === "brevo";
  const results = await Promise.allSettled(
    chunks.map(async (chunk) => {
      const request = isBrevo
        ? {
            url: "https://api.brevo.com/v3/smtp/email",
            headers: { "api-key": config.apiKey, "Content-Type": "application/json", accept: "application/json" },
            body: {
              sender: { name: config.senderName, email: config.senderEmail },
              subject,
              textContent: text,
              htmlContent: html,
              messageVersions: chunk.map((email) => ({ to: [{ email }] })),
            },
          }
        : {
            url: "https://api.resend.com/emails/batch",
            headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
            body: chunk.map((email) => ({ from: config.from, to: [email], subject, text, html })),
          };

      const response = await fetch(request.url, {
        method: "POST",
        headers: request.headers,
        body: JSON.stringify(request.body),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        const providerError = await response.json().catch(() => null);
        console.error(`${config.provider} rejected ${label} batch:`, response.status, providerError?.message || "unknown error");
        throw new AppError(SEND_FAILED_MESSAGE, 502, "EMAIL_SEND_FAILED");
      }
      return chunk.length;
    })
  );

  const sent = results.reduce((acc, r) => acc + (r.status === "fulfilled" ? r.value : 0), 0);
  return { total: recipients.length, sent, failed: recipients.length - sent };
}
