import assert from "node:assert/strict";
import { after, before, mock, test } from "node:test";
import { once } from "node:events";
import express from "express";
import { z } from "zod";

process.env.SUPABASE_URL ||= "http://127.0.0.1:9";
process.env.SUPABASE_ANON_KEY ||= "test-anon-key";

const { default: app } = await import("../../src/app.js");
const { default: validate } = await import("../../src/middlewares/validate.middleware.js");
const { default: EmailService } = await import("../../src/services/email.service.js");

let server;
let base;
before(async () => {
  server = app.listen(0);
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

test("request không có body: req.body vẫn là {} như Express 4 (lỗi kiểm tra theo từng trường, không 500)", async () => {
  const res = await fetch(`${base}/api/auth/login`, { method: "POST" });
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.error, "VALIDATION_ERROR");
  assert.deepEqual(body.details.map((d) => d.field).sort(), ["email", "password"]);
});

test("validate(schema, \"query\") chạy được trên Express 5 (req.query chỉ có getter)", async () => {
  const mini = express();
  mini.get("/q", validate(z.object({ page: z.coerce.number().default(1) }), "query"), (req, res) => res.json(req.query));
  const s = mini.listen(0);
  await once(s, "listening");
  const res = await fetch(`http://127.0.0.1:${s.address().port}/q?page=3`);
  assert.deepEqual(await res.json(), { page: 3 });
  s.close();
});

test("production thiếu cấu hình email: báo EMAIL_NOT_CONFIGURED, không in OTP ra log", async () => {
  const saved = { env: process.env.NODE_ENV, key: process.env.RESEND_API_KEY, provider: process.env.EMAIL_PROVIDER };
  process.env.NODE_ENV = "production";
  process.env.EMAIL_PROVIDER = "resend";
  delete process.env.RESEND_API_KEY;
  const log = mock.method(console, "log", () => {});
  try {
    await assert.rejects(EmailService.sendPasswordResetOtp({ email: "a@x.com", otp: "123456", expiresInMinutes: 10 }), {
      errorCode: "EMAIL_NOT_CONFIGURED",
    });
    await assert.rejects(EmailService.sendEmailVerificationOtp({ email: "a@x.com", otp: "123456", expiresInMinutes: 10 }), {
      errorCode: "EMAIL_NOT_CONFIGURED",
    });
    assert.ok(!log.mock.calls.some((c) => String(c.arguments.join(" ")).includes("123456")), "OTP không được xuất hiện trong log");
  } finally {
    log.mock.restore();
    process.env.NODE_ENV = saved.env;
    if (saved.key !== undefined) process.env.RESEND_API_KEY = saved.key;
    if (saved.provider !== undefined) process.env.EMAIL_PROVIDER = saved.provider;
    else delete process.env.EMAIL_PROVIDER;
  }
});
