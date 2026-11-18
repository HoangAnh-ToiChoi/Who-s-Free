import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { installFakeEmailVerifications } from "../helpers/fakeEmailVerifications.js";

process.env.SUPABASE_URL ||= "http://127.0.0.1:9";
process.env.SUPABASE_ANON_KEY ||= "test-anon-key";

const { default: Model } = await import("../../src/models/email-verification.model.js");
const { default: SupabaseAuthModel } = await import("../../src/models/supabase-auth.model.js");
const { default: EmailService } = await import("../../src/services/email.service.js");
const { default: Service } = await import("../../src/services/email-verification.service.js");

const service = new Service();
const user = { userId: "u1", email: "An@Example.com" };
let fake;
let mocks;
let sent;

beforeEach(() => {
  fake = installFakeEmailVerifications(Model);
  sent = [];
  mocks = [
    mock.method(EmailService, "sendEmailVerificationOtp", async (m) => sent.push(m)),
    mock.method(console, "warn", () => {}),
  ];
});
afterEach(() => {
  fake.restore();
  mocks.forEach((m) => m.mock.restore());
});

test("dispatch: gửi mã 6 số, lưu email chữ thường, chỉ lưu HMAC", async () => {
  const result = await service.dispatch(user, "register", { ip: "1.1.1.1", userAgent: "UA" });
  assert.deepEqual(result, { sent: true, retryAfterSeconds: Service.RESEND_COOLDOWN_SECONDS });
  assert.equal(fake.rows[0].email, "an@example.com");
  assert.match(sent[0].otp, /^\d{6}$/);
  assert.notEqual(fake.rows[0].otpHash, sent[0].otp);
});

test("dispatch: trong 60 giây không gửi thêm; quá 5 lần/giờ phải chờ", async () => {
  await service.dispatch(user, "register");
  const soon = await service.dispatch(user, "resend");
  assert.equal(soon.sent, false);
  assert.ok(soon.retryAfterSeconds > 0 && soon.retryAfterSeconds <= 60);

  for (const r of fake.rows) r.sentAt = new Date(Date.now() - 10 * 60_000);
  for (let i = 0; i < 4; i += 1) {
    fake.rows.push({ ...fake.rows[0], id: `x${i}`, status: "superseded" });
  }
  const capped = await service.dispatch(user, "resend");
  assert.deepEqual(capped, { sent: false, retryAfterSeconds: 3600 });
});

test("dispatch: Brevo lỗi → dòng ghi send_failed, không ném lỗi ra luồng đăng ký", async () => {
  mocks.push(mock.method(EmailService, "sendEmailVerificationOtp", async () => { throw new Error("quota"); }));
  const result = await service.dispatch(user, "register");
  assert.equal(result.failed, true);
  assert.equal(fake.rows[0].status, "send_failed");
});

test("verify: email lạ / hết hạn đều trả cùng một lỗi chung", async () => {
  await assert.rejects(service.verify({ email: "nobody@x.com", otp: "123456" }, {}), { errorCode: "VERIFY_CODE_INVALID" });
  await service.dispatch(user, "register");
  fake.rows[0].expiresAt = new Date(Date.now() - 1000);
  await assert.rejects(service.verify({ email: user.email, otp: sent[0].otp }, {}), { errorCode: "VERIFY_CODE_INVALID" });
  assert.equal(fake.rows[0].status, "expired");
});

test("secureOAuthAccount: tài khoản Google bình thường (không có dòng xác thực) không bị đụng tới", async () => {
  const update = mock.method(SupabaseAuthModel, "updateUser", async () => ({}));
  mocks.push(update);
  await service.secureOAuthAccount({ id: "google-user", email: "g@x.com" });
  assert.equal(update.mock.callCount(), 0);
});
