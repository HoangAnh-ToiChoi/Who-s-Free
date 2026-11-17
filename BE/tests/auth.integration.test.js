import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, mock, test } from "node:test";
import { once } from "node:events";
import jwt from "jsonwebtoken";
import { installFakeRefreshSessions } from "./helpers/fakeRefreshSessions.js";
import { installFakeEmailVerifications } from "./helpers/fakeEmailVerifications.js";

const TEST_JWT_SECRET = "auth-integration-test-secret-at-least-32-characters";
const TEST_REFRESH_SECRET = "auth-integration-refresh-secret-at-least-32-characters";
const TEST_EMAIL = "auth-test@example.com";
const TEST_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: TEST_EMAIL,
  user_metadata: { full_name: "Auth Test" },
  role: "authenticated",
  created_at: "2026-01-01T00:00:00.000Z",
  email_confirmed_at: "2026-01-01T00:00:00.000Z",
};
const NEW_EMAIL = "new-user@example.com";
const NEW_USER = {
  ...TEST_USER,
  id: "00000000-0000-0000-0000-000000000002",
  email: NEW_EMAIL,
  email_confirmed_at: null,
};

let app;
let supabase;
let supabaseAdmin;
let AuthService;
let RecoveryService;
let UserModel;
let RefreshSessionModel;
let sessions;
let verifications;
let EmailService;
let sentCodes;
let TokenService;
let pool;
let server;
let baseUrl;
const stubs = [];

function stub(target, method, implementation) {
  stubs.push(mock.method(target, method, implementation));
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  return { response, data };
}

async function post(path, body, options = {}) {
  return request(path, { ...options, method: "POST", body });
}

function validAccessToken() {
  if (TokenService?.generateAccessToken) {
    return TokenService.generateAccessToken(TEST_USER);
  }
  return jwt.sign(
    { sub: TEST_USER.id, email: TEST_EMAIL, role: "authenticated", token_type: "access" },
    TEST_JWT_SECRET,
    { expiresIn: "15m", algorithm: "HS256", issuer: "whosfree-api", audience: "whosfree-client" }
  );
}

function setDefaultAuthMocks() {
  stub(supabase.auth, "signUp", async ({ email, options }) => ({
    data: {
      user: {
        ...TEST_USER,
        email,
        user_metadata: options.data,
        confirmed_at: null,
      },
    },
    error: null,
  }));
  stub(supabase.auth, "signInWithPassword", async () => ({
    data: { user: TEST_USER },
    error: null,
  }));
  stub(supabase.auth, "resetPasswordForEmail", async () => ({
    data: {},
    error: null,
  }));
  stub(supabase.auth, "signInWithOAuth", async () => ({
    data: { url: "https://accounts.google.test/oauth" },
    error: null,
  }));
  stub(supabase.auth, "exchangeCodeForSession", async () => ({
    data: { user: TEST_USER },
    error: null,
  }));
  stub(supabase.auth, "signOut", async () => ({ error: null }));

  const adminList = [supabase.auth.admin];
  if (supabaseAdmin?.auth?.admin && supabaseAdmin.auth.admin !== supabase.auth.admin) {
    adminList.push(supabaseAdmin.auth.admin);
  }
  for (const admin of adminList) {
    stub(admin, "getUserById", async () => ({
      data: { user: TEST_USER },
      error: null,
    }));
    stub(admin, "listUsers", async () => ({
      data: { users: [TEST_USER] },
      error: null,
    }));
    stub(admin, "updateUserById", async () => ({
      data: { user: TEST_USER },
      error: null,
    }));
    stub(admin, "createUser", async ({ email, user_metadata, email_confirm }) => ({
      data: { user: { ...NEW_USER, email, user_metadata, email_confirmed_at: email_confirm ? new Date().toISOString() : null } },
      error: null,
    }));
  }
  stub(EmailService, "sendEmailVerificationOtp", async ({ email, otp }) => {
    sentCodes.push({ email, otp });
    return { id: "test" };
  });
}

/** Admin API thấy NEW_USER (chưa xác thực) bên cạnh TEST_USER; updateUserById ghi nhận việc xác nhận email. */
function withUnverifiedNewUser() {
  const state = { user: { ...NEW_USER }, updates: [] };
  for (const admin of new Set([supabase.auth.admin, supabaseAdmin?.auth?.admin].filter(Boolean))) {
    stub(admin, "listUsers", async () => ({ data: { users: [TEST_USER, state.user] }, error: null }));
    stub(admin, "updateUserById", async (id, attributes) => {
      state.updates.push({ id, attributes });
      if (attributes.email_confirm) state.user.email_confirmed_at = new Date().toISOString();
      return { data: { user: state.user }, error: null };
    });
  }
  return state;
}

before(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = TEST_REFRESH_SECRET;
  process.env.CLIENT_ORIGIN = "http://localhost:5173";
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-service-role-key";

  ({ default: app } = await import("../src/app.js"));
  ({ pool } = await import("../src/configs/db.config.js"));
  ({ default: supabase, supabaseAdmin } = await import("../src/configs/supabase.config.js"));
  ({ default: AuthService } = await import("../src/services/auth.service.js"));
  ({ default: RecoveryService } = await import("../src/services/recovery.service.js"));
  ({ default: UserModel } = await import("../src/models/user.model.js"));
  ({ default: RefreshSessionModel } = await import("../src/models/refresh-session.model.js"));
  sessions = installFakeRefreshSessions(RefreshSessionModel, (id) => ({
    id, email: TEST_EMAIL, full_name: "Auth Test", avatar_url: null, created_at: TEST_USER.created_at,
  }));
  ({ default: TokenService } = await import("../src/services/token.service.js"));
  ({ default: EmailService } = await import("../src/services/email.service.js"));
  verifications = installFakeEmailVerifications(
    (await import("../src/models/email-verification.model.js")).default
  );

  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  sessions.restore();
  verifications.restore();
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
});

beforeEach(() => {
  AuthService.otpStore.clear();
  sessions.rows.clear();
  verifications.rows.length = 0;
  sentCodes = [];
  if (RecoveryService?.consumedResetTokens) RecoveryService.consumedResetTokens.clear();
  setDefaultAuthMocks();
});

afterEach(() => {
  for (const stubbedMethod of stubs.splice(0).reverse()) {
    stubbedMethod.mock.restore();
  }
});

test("health endpoint responds with the standard success envelope", async () => {
  const { response, data } = await request("/api/health");
  assert.equal(response.status, 200);
  assert.equal(data.success, true);
  // "healthy" when DB is reachable; "degraded" in test/dev environments without a DB
  assert.ok(["healthy", "degraded"].includes(data.data.status), `Unexpected status: ${data.data.status}`);
  assert.equal(data.error, null);
});

test("register rejects missing fields without calling Supabase", async () => {
  const { response, data } = await post("/api/auth/register", { email: TEST_EMAIL });
  assert.equal(response.status, 400);
  assert.equal(data.success, false);
});

test("register creates an unverified account, emails a code and does NOT sign in", async () => {
  const { response, data } = await post("/api/auth/register", {
    fullName: "New User",
    email: NEW_EMAIL,
    password: "StrongPassword123!",
  });
  assert.equal(response.status, 201);
  assert.equal(data.data.requiresVerification, true);
  assert.equal(data.data.email, NEW_EMAIL);
  assert.equal(data.data.codeSent, true);
  assert.equal(data.data.accessToken, undefined);
  assert.deepEqual(response.headers.getSetCookie(), []);
  assert.equal(sentCodes.length, 1);
  assert.match(sentCodes[0].otp, /^\d{6}$/);
  assert.equal(verifications.rows[0].reason, "register");
  assert.notEqual(verifications.rows[0].otpHash, sentCodes[0].otp, "chỉ lưu HMAC, không lưu mã gốc");
});

test("register with an email that is already verified returns 409", async () => {
  for (const admin of new Set([supabase.auth.admin, supabaseAdmin?.auth?.admin].filter(Boolean))) {
    stub(admin, "createUser", async () => ({ data: { user: null }, error: Object.assign(new Error("A user with this email address has already been registered"), { code: "email_exists" }) }));
  }
  const { response, data } = await post("/api/auth/register", {
    fullName: "Auth Test",
    email: TEST_EMAIL,
    password: "StrongPassword123!",
  });
  assert.equal(response.status, 409);
  assert.equal(data.error, "EMAIL_ALREADY_REGISTERED");
});

test("verify-email: wrong code gets a generic message, right code signs in and confirms the email", async () => {
  const state = withUnverifiedNewUser();
  await post("/api/auth/register", { fullName: "New User", email: NEW_EMAIL, password: "StrongPassword123!" });
  const otp = sentCodes[0].otp;
  const wrong = otp === "111111" ? "222222" : "111111";

  const bad = await post("/api/auth/verify-email", { email: NEW_EMAIL, otp: wrong });
  assert.equal(bad.response.status, 400);
  assert.equal(bad.data.error, "VERIFY_CODE_INVALID");
  assert.doesNotMatch(bad.data.message, /lần/, "không tiết lộ số lần thử còn lại");

  const ok = await post("/api/auth/verify-email", { email: NEW_EMAIL, otp });
  assert.equal(ok.response.status, 200);
  assert.ok(ok.data.data.accessToken);
  assert.match(ok.response.headers.getSetCookie().join(";"), /refresh_token=rt_/);
  assert.ok(state.updates.some((u) => u.attributes.email_confirm === true));
  assert.equal(verifications.rows[0].status, "verified");

  const reused = await post("/api/auth/verify-email", { email: NEW_EMAIL, otp });
  assert.equal(reused.data.error, "VERIFY_CODE_INVALID");
});

test("verify-email: 5 wrong codes lock the code; even the right code then fails the same way", async () => {
  withUnverifiedNewUser();
  await post("/api/auth/register", { fullName: "New User", email: NEW_EMAIL, password: "StrongPassword123!" });
  const otp = sentCodes[0].otp;
  const wrong = otp === "111111" ? "222222" : "111111";
  for (let i = 0; i < 5; i += 1) await post("/api/auth/verify-email", { email: NEW_EMAIL, otp: wrong });
  assert.equal(verifications.rows[0].status, "locked");
  const { data } = await post("/api/auth/verify-email", { email: NEW_EMAIL, otp });
  assert.equal(data.error, "VERIFY_CODE_INVALID");
});

test("login with correct password but unverified email → 403 EMAIL_NOT_VERIFIED, new code, no cookies", async () => {
  withUnverifiedNewUser();
  stub(supabase.auth, "signInWithPassword", async () => ({
    data: { user: null },
    error: Object.assign(new Error("Email not confirmed"), { code: "email_not_confirmed" }),
  }));
  const { response, data } = await post("/api/auth/login", { email: NEW_EMAIL, password: "StrongPassword123!" });
  assert.equal(response.status, 403);
  assert.equal(data.error, "EMAIL_NOT_VERIFIED");
  assert.equal(data.details.email, NEW_EMAIL);
  assert.equal(data.details.codeSent, true);
  assert.deepEqual(response.headers.getSetCookie(), []);
  assert.equal(verifications.rows[0].reason, "login");
});

test("resend: waits 60s between codes; unknown email answers like a normal send", async () => {
  withUnverifiedNewUser();
  await post("/api/auth/register", { fullName: "New User", email: NEW_EMAIL, password: "StrongPassword123!" });
  const tooSoon = await post("/api/auth/verify-email/resend", { email: NEW_EMAIL });
  assert.equal(tooSoon.response.status, 429);
  assert.equal(tooSoon.data.error, "VERIFY_RESEND_WAIT");
  assert.ok(tooSoon.data.details.retryAfterSeconds > 0);

  verifications.rows[0].sentAt = new Date(Date.now() - 61_000);
  const again = await post("/api/auth/verify-email/resend", { email: NEW_EMAIL });
  assert.equal(again.response.status, 200);
  assert.equal(sentCodes.length, 2);
  assert.equal(verifications.rows[0].status, "superseded");

  const unknown = await post("/api/auth/verify-email/resend", { email: "nobody@example.com" });
  assert.equal(unknown.response.status, 200);
  assert.equal(sentCodes.length, 2, "email lạ không gửi gì");
});

test("Google login into an unverified self-signup replaces its password", async () => {
  const state = withUnverifiedNewUser();
  await post("/api/auth/register", { fullName: "New User", email: NEW_EMAIL, password: "AttackerPassword1!" });
  stub(supabase.auth, "exchangeCodeForSession", async () => ({ data: { user: { ...NEW_USER, email_confirmed_at: new Date().toISOString() } }, error: null }));
  const response = await fetch(`${baseUrl}/api/auth/google/callback?code=abc`, { redirect: "manual" });
  assert.ok(response.status >= 300 && response.status < 400);
  const reset = state.updates.find((u) => u.attributes.password);
  assert.ok(reset, "mật khẩu cũ phải bị thay");
  assert.notEqual(reset.attributes.password, "AttackerPassword1!");
  assert.equal(verifications.rows.at(-1).reason, "oauth");
});

test("login rejects missing fields", async () => {
  const { response } = await post("/api/auth/login", { email: TEST_EMAIL });
  assert.equal(response.status, 400);
});

test("login sets httpOnly refresh cookie and returns an access token in JSON", async () => {
  const { response, data } = await post("/api/auth/login", {
    email: TEST_EMAIL,
    password: "StrongPassword123!",
  });
  const cookies = response.headers.getSetCookie();
  assert.equal(response.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.user.id, TEST_USER.id);
  assert.ok(data.data.accessToken);
  assert.match(cookies.join(";"), /access_token=.*HttpOnly/i);
  assert.match(cookies.join(";"), /refresh_token=rt_.*HttpOnly/i);
  assert.equal(jwt.verify(data.data.accessToken, TEST_JWT_SECRET).sub, TEST_USER.id);

  // Refresh token được lưu (dạng băm) thành một phiên thiết bị; access token mang id phiên đó
  const refreshToken = cookies.join(";").match(/refresh_token=(rt_[^;]+)/)[1];
  const stored = sessions.findByToken(refreshToken);
  assert.ok(stored);
  assert.equal(jwt.verify(data.data.accessToken, TEST_JWT_SECRET).sid, stored.id);
});

test("login rejects invalid credentials without issuing cookies", async () => {
  stub(supabase.auth, "signInWithPassword", async () => ({
    data: { user: null },
    error: new Error("Invalid login credentials"),
  }));
  const { response, data } = await post("/api/auth/login", {
    email: TEST_EMAIL,
    password: "wrong-password",
  });
  assert.equal(response.status, 401);
  assert.equal(data.success, false);
  assert.deepEqual(response.headers.getSetCookie(), []);
});

test("protected /me rejects requests without credentials", async () => {
  const { response, data } = await request("/api/auth/me");
  assert.equal(response.status, 401);
  assert.equal(data.success, false);
});

test("protected /me accepts a valid bearer token and returns the profile", async () => {
  const { response, data } = await request("/api/auth/me", {
    headers: { authorization: `Bearer ${validAccessToken()}` },
  });
  assert.equal(response.status, 200);
  assert.equal(data.data.id, TEST_USER.id);
  assert.equal(data.data.email, TEST_EMAIL);
});

test("protected /me rejects invalid and expired tokens", async (context) => {
  const invalid = await request("/api/auth/me", {
    headers: { authorization: "Bearer invalid.token.value" },
  });
  assert.equal(invalid.response.status, 401);

  const expiredToken = jwt.sign(
    { sub: TEST_USER.id, token_type: "access" },
    TEST_JWT_SECRET,
    { expiresIn: -1 }
  );
  const expired = await request("/api/auth/me", {
    headers: { authorization: `Bearer ${expiredToken}` },
  });
  assert.equal(expired.response.status, 401);
  context.diagnostic("Both malformed and expired access tokens are rejected.");
});

test("refresh rejects a missing refresh cookie and clears auth cookies", async () => {
  const { response, data } = await post("/api/auth/refresh", {});
  assert.equal(response.status, 401);
  assert.equal(data.success, false);
  assert.match(response.headers.getSetCookie().join(";"), /access_token=.*Expires=Thu, 01 Jan 1970/i);
});

test("refresh rotates both access token and refresh token in DB and cookies (RTR)", async () => {
  const initialRefreshToken = TokenService.generateRefreshToken();
  sessions.seed(TEST_USER.id, initialRefreshToken);

  const { response, data } = await post(
    "/api/auth/refresh",
    {},
    { headers: { cookie: `refresh_token=${initialRefreshToken}` } }
  );
  assert.equal(response.status, 200);
  assert.equal(jwt.verify(data.data.accessToken, TEST_JWT_SECRET).sub, TEST_USER.id);

  const cookies = response.headers.getSetCookie().join(";");
  assert.match(cookies, /access_token=.*HttpOnly/i);
  assert.match(cookies, /refresh_token=rt_.*HttpOnly/i);

  // Lấy refresh token mới từ cookie
  const match = cookies.match(/refresh_token=(rt_[^;]+)/);
  assert.ok(match);
  const newRefreshToken = match[1];
  assert.notEqual(newRefreshToken, initialRefreshToken);

  // Token cũ bị vô hiệu hóa trong DB (Replay Attack Prevention)
  assert.equal(sessions.findByToken(initialRefreshToken), null);

  // Token mới đã được cập nhật vào DB
  assert.equal(sessions.findByToken(newRefreshToken)?.userId, TEST_USER.id);
});

test("refresh rejects unknown and expired (> 15 days unused) refresh cookies", async () => {
  const unknownToken = await post(
    "/api/auth/refresh",
    {},
    { headers: { cookie: "refresh_token=rt_unknown_nonexistent" } }
  );
  assert.equal(unknownToken.response.status, 401);

  // Phiên không dùng 16 ngày (> 15 ngày)
  const expiredToken = TokenService.generateRefreshToken();
  sessions.seed(TEST_USER.id, expiredToken, { lastUsedAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000) });

  const expired = await post(
    "/api/auth/refresh",
    {},
    { headers: { cookie: `refresh_token=${expiredToken}` } }
  );
  assert.equal(expired.response.status, 401);
  assert.equal(expired.data.error, "REFRESH_TOKEN_EXPIRED");
});

test("forgot password rejects an empty email", async () => {
  const { response } = await post("/api/auth/forgot-password", {});
  assert.equal(response.status, 400);
});

test("forgot password creates a six-digit OTP without returning it in the API response", async (context) => {
  let loggedOtp;
  stub(console, "log", (message) => {
    const match = String(message).match(/: (\d{6})$/);
    if (match) loggedOtp = match[1];
  });
  const { response, data } = await post("/api/auth/forgot-password", { email: TEST_EMAIL });
  assert.equal(response.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.expiresInSeconds, 600);
  assert.equal(data.data.otp, undefined);
  assert.match(loggedOtp, /^\d{6}$/);
  context.diagnostic("The integration test captures the OTP from the service log for the next flow step.");
});

test("OTP verification rejects wrong, expired, and reused codes", async () => {
  let loggedOtp;
  stub(console, "log", (message) => {
    const match = String(message).match(/: (\d{6})$/);
    if (match) loggedOtp = match[1];
  });
  await post("/api/auth/forgot-password", { email: TEST_EMAIL });

  const wrong = await post("/api/auth/verify-otp", { email: TEST_EMAIL, otp: "000000" });
  assert.equal(wrong.response.status, 400);

  const correct = await post("/api/auth/verify-otp", { email: TEST_EMAIL, otp: loggedOtp });
  assert.equal(correct.response.status, 200);
  assert.ok(correct.data.data.resetToken);

  const reused = await post("/api/auth/verify-otp", { email: TEST_EMAIL, otp: loggedOtp });
  assert.equal(reused.response.status, 400);

  AuthService.otpStore.set(TEST_EMAIL, { otp: "123456", expiresAt: Date.now() - 1, attempts: 0 });
  const expired = await post("/api/auth/verify-otp", { email: TEST_EMAIL, otp: "123456" });
  assert.equal(expired.response.status, 400);
});

test("OTP is invalidated after five incorrect attempts", async () => {
  let loggedOtp;
  stub(console, "log", (message) => {
    const match = String(message).match(/: (\d{6})$/);
    if (match) loggedOtp = match[1];
  });
  await post("/api/auth/forgot-password", { email: TEST_EMAIL });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await post("/api/auth/verify-otp", { email: TEST_EMAIL, otp: "000000" });
    assert.equal(result.response.status, 400);
  }
  const correctAfterLockout = await post("/api/auth/verify-otp", {
    email: TEST_EMAIL,
    otp: loggedOtp,
  });
  assert.equal(correctAfterLockout.response.status, 400);
});

test("full password recovery verifies OTP then updates the Supabase password", async () => {
  let loggedOtp;
  let updatedPassword;
  stub(console, "log", (message) => {
    const match = String(message).match(/: (\d{6})$/);
    if (match) loggedOtp = match[1];
  });
  stub(supabase.auth.admin, "updateUserById", async (_id, attributes) => {
    updatedPassword = attributes.password;
    return { data: { user: TEST_USER }, error: null };
  });

  const forgot = await post("/api/auth/forgot-password", { email: TEST_EMAIL });
  assert.equal(forgot.response.status, 200);
  assert.match(loggedOtp, /^\d{6}$/);

  const verification = await post("/api/auth/verify-otp", {
    email: TEST_EMAIL,
    otp: loggedOtp,
  });
  assert.equal(verification.response.status, 200);

  const reset = await post("/api/auth/reset-password", {
    email: TEST_EMAIL,
    resetToken: verification.data.data.resetToken,
    password: "RecoveredPassword123!",
    confirmPassword: "RecoveredPassword123!",
  });
  assert.equal(reset.response.status, 200);
  assert.equal(updatedPassword, "RecoveredPassword123!");
});

test("reset password rejects an invalid token, short password, and mismatched confirmation", async () => {
  const payload = {
    email: TEST_EMAIL,
    resetToken: "invalid-token",
    password: "NewPassword123!",
    confirmPassword: "NewPassword123!",
  };
  const invalidToken = await post("/api/auth/reset-password", payload);
  assert.equal(invalidToken.response.status, 400);

  const shortPassword = await post("/api/auth/reset-password", {
    ...payload,
    resetToken: TokenService.generateResetToken(TEST_EMAIL),
    password: "short",
    confirmPassword: "short",
  });
  assert.equal(shortPassword.response.status, 400);

  const mismatched = await post("/api/auth/reset-password", {
    ...payload,
    resetToken: TokenService.generateResetToken(TEST_EMAIL),
    confirmPassword: "DifferentPassword123!",
  });
  assert.equal(mismatched.response.status, 400);
});

test("reset password updates the Supabase user when a verified reset token is supplied", async () => {
  let updateCall;
  stub(supabase.auth.admin, "updateUserById", async (...args) => {
    updateCall = args;
    return { data: { user: TEST_USER }, error: null };
  });
  const resetToken = TokenService.generateResetToken(TEST_EMAIL);
  const { response, data } = await post("/api/auth/reset-password", {
    email: TEST_EMAIL,
    resetToken,
    password: "NewPassword123!",
    confirmPassword: "NewPassword123!",
  });
  assert.equal(response.status, 200);
  assert.equal(data.success, true);
  assert.equal(updateCall[0], TEST_USER.id);
  assert.equal(updateCall[1].password, "NewPassword123!");
});

test("logout clears access and refresh cookies and revokes token from DB", async () => {
  const userRefreshToken = TokenService.generateRefreshToken();
  sessions.seed(TEST_USER.id, userRefreshToken);

  const { response, data } = await post(
    "/api/auth/logout",
    {},
    { headers: { cookie: `refresh_token=${userRefreshToken}` } }
  );
  assert.equal(response.status, 200);
  assert.equal(data.success, true);

  // Refresh token đã bị thu hồi khỏi DB
  assert.equal(sessions.findByToken(userRefreshToken), null);

  const cookies = response.headers.getSetCookie().join(";");
  assert.match(cookies, /access_token=.*Expires=Thu, 01 Jan 1970/i);
  assert.match(cookies, /refresh_token=.*Expires=Thu, 01 Jan 1970/i);
});

test("AuthMiddleware rejects resetToken used as access token", async () => {
  const resetToken = TokenService.generateResetToken(TEST_EMAIL);
  const { response, data } = await request("/api/auth/me", {
    headers: { authorization: `Bearer ${resetToken}` },
  });
  assert.equal(response.status, 401);
  assert.equal(data.error, "INVALID_TOKEN_TYPE");
});

test("reset password token cannot be reused more than once", async () => {
  stub(supabase.auth.admin, "updateUserById", async () => ({
    data: { user: TEST_USER },
    error: null,
  }));
  const resetToken = TokenService.generateResetToken(TEST_EMAIL);
  const firstAttempt = await post("/api/auth/reset-password", {
    email: TEST_EMAIL,
    resetToken,
    password: "NewPassword123!",
    confirmPassword: "NewPassword123!",
  });
  assert.equal(firstAttempt.response.status, 200);

  const secondAttempt = await post("/api/auth/reset-password", {
    email: TEST_EMAIL,
    resetToken,
    password: "AnotherPassword123!",
    confirmPassword: "AnotherPassword123!",
  });
  assert.equal(secondAttempt.response.status, 400);
  assert.equal(secondAttempt.data.error, "RESET_TOKEN_ALREADY_USED");
});

test("Google OAuth initialization redirects to the provider URL", async () => {
  const response = await fetch(`${baseUrl}/api/auth/google`, { redirect: "manual" });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "https://accounts.google.test/oauth");
});

test("Google callback requires a code and sets session cookies on success", async () => {
  const missingCode = await request("/api/auth/google/callback");
  assert.equal(missingCode.response.status, 400);

  const response = await fetch(`${baseUrl}/api/auth/google/callback?code=test-code`, {
    redirect: "manual",
    headers: {
      cookie: "oauth_return_url=%2Fauth%2Fsuccess",
    },
  });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "http://localhost:5173/auth/success");
  assert.match(response.headers.getSetCookie().join(";"), /access_token=.*HttpOnly/i);
  assert.match(response.headers.getSetCookie().join(";"), /refresh_token=rt_.*HttpOnly/i);
});

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36";
const WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 coc_coc_browser/120.0";

async function loginWith(userAgent) {
  const { response, data } = await post(
    "/api/auth/login",
    { email: TEST_EMAIL, password: "StrongPassword123!" },
    { headers: { "user-agent": userAgent } }
  );
  assert.equal(response.status, 200);
  const refreshToken = response.headers.getSetCookie().join(";").match(/refresh_token=(rt_[^;]+)/)[1];
  return { accessToken: data.data.accessToken, refreshToken };
}

test("devices: phone and computer stay signed in together; a second phone replaces the first phone", async () => {
  const phoneA = await loginWith(IPHONE);
  const computer = await loginWith(WINDOWS);
  assert.equal(sessions.rows.size, 2);

  const phoneB = await loginWith(ANDROID);
  assert.equal(sessions.rows.size, 2);
  assert.deepEqual([...sessions.rows.values()].map((r) => r.kind).sort(), ["desktop", "mobile"]);

  // Điện thoại A bị đá: access token bị từ chối ngay, refresh token không dùng được nữa
  const me = await request("/api/auth/me", { headers: { authorization: `Bearer ${phoneA.accessToken}` } });
  assert.equal(me.response.status, 401);
  assert.equal(me.data.error, "SESSION_REVOKED");
  const refreshA = await post("/api/auth/refresh", {}, { headers: { cookie: `refresh_token=${phoneA.refreshToken}` } });
  assert.equal(refreshA.response.status, 401);

  // Máy tính và điện thoại B vẫn dùng bình thường
  for (const device of [computer, phoneB]) {
    const ok = await request("/api/auth/me", { headers: { authorization: `Bearer ${device.accessToken}` } });
    assert.equal(ok.response.status, 200);
  }
});

test("devices: logout only signs out the current device", async () => {
  const phone = await loginWith(IPHONE);
  const computer = await loginWith(WINDOWS);

  await post("/api/auth/logout", {}, { headers: { cookie: `refresh_token=${phone.refreshToken}` } });

  const phoneMe = await request("/api/auth/me", { headers: { authorization: `Bearer ${phone.accessToken}` } });
  assert.equal(phoneMe.response.status, 401);
  const computerMe = await request("/api/auth/me", { headers: { authorization: `Bearer ${computer.accessToken}` } });
  assert.equal(computerMe.response.status, 200);
});
