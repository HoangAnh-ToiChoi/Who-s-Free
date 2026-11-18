import { mock } from "node:test";

/**
 * Thay các hàm DB của EmailVerificationModel bằng bộ nhớ (test auth chạy không cần PostgreSQL).
 * Trả về { rows, restore } — rows là mảng các lần gửi mã, mới nhất ở cuối.
 */
export function installFakeEmailVerifications(Model) {
  const rows = [];
  const mocks = [];
  const fake = (name, impl) => mocks.push(mock.method(Model, name, impl));
  const byId = (id) => rows.find((r) => r.id === id);

  fake("sendStats", async (email) => {
    const sends = rows.filter((r) => r.email === email && ["register", "login", "resend"].includes(r.reason));
    const hourAgo = Date.now() - 3600_000;
    return {
      lastSentAt: sends.length ? sends[sends.length - 1].sentAt : null,
      sentLastHour: sends.filter((r) => r.sentAt.getTime() > hourAgo).length,
    };
  });
  fake("supersedePending", async (email) => {
    for (const r of rows) if (r.email === email && r.status === "pending") r.status = "superseded";
  });
  fake("create", async ({ userId, email, otpHash = null, reason, status = "pending", expiresAt = null }) => {
    const id = crypto.randomUUID();
    rows.push({ id, userId, email, otpHash, reason, status, attempts: 0, sentAt: new Date(), expiresAt });
    return id;
  });
  fake("setStatus", async (id, status) => {
    byId(id).status = status;
  });
  fake("findLatestPending", async (email) => {
    const row = rows.filter((r) => r.email === email && r.status === "pending").pop();
    return row ? { ...row } : null;
  });
  fake("recordFailedAttempt", async (id) => ++byId(id).attempts);
  fake("isUnverifiedSignup", async (userId) => {
    const mine = rows.filter((r) => r.userId === userId);
    return mine.length > 0 && !mine.some((r) => r.status === "verified");
  });

  return { rows, restore: () => mocks.forEach((m) => m.mock.restore()) };
}
