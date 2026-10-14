import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, mock, test } from "node:test";
import { once } from "node:events";
import jwt from "jsonwebtoken";

const TEST_JWT_SECRET = "auth-integration-test-secret-at-least-32-characters";
const TEST_REFRESH_SECRET = "auth-integration-refresh-secret-at-least-32-characters";
const TEST_EMAIL = "auth-test@example.com";
const TEST_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: TEST_EMAIL,
  user_metadata: { full_name: "Auth Test" },
  role: "authenticated",
  created_at: "2026-01-01T00:00:00.000Z",
};

let app;
let supabase;
let supabaseAdmin;
let AuthService;
let RecoveryService;
let UserModel;
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
  }
}

before(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = TEST_REFRESH_SECRET;
  process.env.CLIENT_ORIGIN = "http://localhost:5173";

  ({ default: app } = await import("../src/app.js"));
  ({ pool } = await import("../src/configs/db.config.js"));
  ({ default: supabase, supabaseAdmin } = await import("../src/configs/supabase.config.js"));
  ({ default: AuthService } = await import("../src/services/auth.service.js"));
  ({ default: RecoveryService } = await import("../src/services/recovery.service.js"));
  ({ default: UserModel } = await import("../src/models/user.model.js"));
  ({ default: TokenService } = await import("../src/services/token.service.js"));

  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
});

beforeEach(() => {
  AuthService.otpStore.clear();
  if (UserModel?._inMemoryTokens) UserModel._inMemoryTokens.clear();
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
  assert.equal(data.data.status, "healthy");
  assert.equal(data.error, null);
});

test("register rejects missing fields without calling Supabase", async () => {
  const { response, data } = await post("/api/auth/register", { email: TEST_EMAIL });
  assert.equal(response.status, 400);
  assert.equal(data.success, false);
});

test("register creates a user and returns the documented response envelope", async () => {
  const { response, data } = await post("/api/auth/register", {
    fullName: "Auth Test",
    email: TEST_EMAIL,
    password: "StrongPassword123!",
  });
  assert.equal(response.status, 201);
  assert.equal(data.success, true);
  // Envelope mới: { user, accessToken } — user fields nằm trong data.data.user
  assert.equal(data.data.user.email, TEST_EMAIL);
  assert.equal(data.data.user.fullName, "Auth Test");
  assert.equal(data.data.user.password, undefined);
  assert.ok(data.data.accessToken, "accessToken phải có trong response");
  assert.equal(data.data.refreshToken, undefined, "refreshToken không được lộ trong JSON");
});

test("register surfaces provider failure as a client error", async () => {
  stub(supabase.auth, "signUp", async () => ({
    data: { user: null },
    error: new Error("Email already registered"),
  }));
  const { response, data } = await post("/api/auth/register", {
    fullName: "Auth Test",
    email: TEST_EMAIL,
    password: "StrongPassword123!",
  });
  assert.equal(response.status, 400);
  assert.equal(data.success, false);
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

  // Kiểm tra refresh token được lưu trữ cho user
  const storedUser = await UserModel.findById(TEST_USER.id);
  const storedToken =
    UserModel._inMemoryTokens.get(TEST_USER.id)?.refreshToken ||
    storedUser?.refresh_token;
  assert.ok(storedToken);
  assert.match(storedToken, /^(rt_|[\da-f]{64})/i);
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
  await UserModel.updateRefreshToken(TEST_USER.id, initialRefreshToken);

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
  const oldUser = await UserModel.findByRefreshToken(initialRefreshToken);
  assert.equal(oldUser, null);

  // Token mới đã được cập nhật vào DB
  const newUser = await UserModel.findByRefreshToken(newRefreshToken);
  assert.ok(newUser);
  assert.equal(newUser.id, TEST_USER.id);
});

test("refresh rejects unknown and expired (> 5 days) refresh cookies", async () => {
  const unknownToken = await post(
    "/api/auth/refresh",
    {},
    { headers: { cookie: "refresh_token=rt_unknown_nonexistent" } }
  );
  assert.equal(unknownToken.response.status, 401);

  // Giả lập token đã tạo từ 6 ngày trước (> 5 ngày)
  const expiredToken = TokenService.generateRefreshToken();
  UserModel._inMemoryTokens.set(TEST_USER.id, {
    refreshToken: expiredToken,
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
  });

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
  await UserModel.updateRefreshToken(TEST_USER.id, userRefreshToken);

  const { response, data } = await post(
    "/api/auth/logout",
    {},
    { headers: { cookie: `refresh_token=${userRefreshToken}` } }
  );
  assert.equal(response.status, 200);
  assert.equal(data.success, true);

  // Refresh token đã bị thu hồi khỏi DB
  const revokedUser = await UserModel.findByRefreshToken(userRefreshToken);
  assert.equal(revokedUser, null);

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
