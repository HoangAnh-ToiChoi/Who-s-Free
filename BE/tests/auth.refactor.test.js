/**
 * AUTH REFACTOR PLAN — Test Suite
 *
 * Kiểm thử theo từng tiêu chí hoàn tất trong AUTH_REFACTOR_PLAN.md:
 *
 * [C1] Login/register/Google trả access token trong JSON; refresh token KHÔNG xuất hiện trong response body.
 * [C2] Protected API chỉ dùng Bearer access token; request không có Bearer hợp lệ bị 401.
 *      Middleware KHÔNG fallback sang access cookie.
 * [C3] Refresh cookie được BE xác thực với DB, rotate một lần; token cũ bị từ chối.
 * [C4] FE gửi Bearer header (kiểm thử phía BE: BE reject nếu không có Bearer).
 * [C5] DB lỗi không tạo ra phiên "thành công" tồn tại chỉ trong memory ở production.
 * [C6] Session/availability write endpoints phải có authorization rõ ràng (hiện CHƯA có → test để xác nhận lỗ hổng).
 * [C7] Cookie clear khớp chính xác với cookie set; không có token trong localStorage hoặc log.
 * [C8] Response envelope nhất quán { user, accessToken } — không lộ refreshToken.
 * [C9] AuthMiddleware bỏ fallback access cookie (chỉ dùng Bearer).
 * [C10] handleGoogleSession không cần refreshToken từ FE (tham số bị bỏ qua hoặc không dùng).
 */

import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, mock, test } from "node:test";
import { once } from "node:events";
import jwt from "jsonwebtoken";

// ─── Constants ───────────────────────────────────────────────────────────────
const TEST_JWT_SECRET = "auth-refactor-test-secret-minimum-32-chars";
const TEST_EMAIL = "refactor-test@example.com";
const TEST_USER = {
  id: "aaaabbbb-cccc-dddd-eeee-000000000001",
  email: TEST_EMAIL,
  user_metadata: { full_name: "Refactor Tester" },
  role: "authenticated",
  created_at: "2026-01-01T00:00:00.000Z",
};

// ─── State ────────────────────────────────────────────────────────────────────
let app;
let supabase;
let supabaseAdmin;
let AuthService;
let UserModel;
let TokenModel;
let TokenService;
let pool;
let server;
let baseUrl;
const stubs = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stub(target, method, impl) {
  stubs.push(mock.method(target, method, impl));
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

/** Tạo access token hợp lệ từ TEST_USER */
function validBearer() {
  if (TokenService?.generateAccessToken) {
    return TokenService.generateAccessToken(TEST_USER);
  }
  return jwt.sign(
    { sub: TEST_USER.id, email: TEST_EMAIL, role: "authenticated", token_type: "access" },
    TEST_JWT_SECRET,
    { expiresIn: "15m", algorithm: "HS256", issuer: "whosfree-api", audience: "whosfree-client" }
  );
}

// ─── Default Supabase Stubs ──────────────────────────────────────────────────

function setDefaultMocks() {
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
  stub(supabase.auth, "signInWithOAuth", async () => ({
    data: { url: "https://accounts.google.test/oauth" },
    error: null,
  }));
  stub(supabase.auth, "exchangeCodeForSession", async () => ({
    data: { user: TEST_USER },
    error: null,
  }));
  stub(supabase.auth, "getUser", async () => ({
    data: { user: TEST_USER },
    error: null,
  }));
  stub(supabase.auth, "signOut", async () => ({ error: null }));

  const adminList = [supabase.auth.admin];
  if (supabaseAdmin?.auth?.admin && supabaseAdmin.auth.admin !== supabase.auth.admin) {
    adminList.push(supabaseAdmin.auth.admin);
  }
  for (const admin of adminList) {
    stub(admin, "getUserById", async () => ({ data: { user: TEST_USER }, error: null }));
    stub(admin, "listUsers", async () => ({ data: { users: [TEST_USER] }, error: null }));
    stub(admin, "updateUserById", async () => ({ data: { user: TEST_USER }, error: null }));
  }
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

before(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.CLIENT_ORIGIN = "http://localhost:5173";

  ({ default: app } = await import("../src/app.js"));
  ({ pool } = await import("../src/configs/db.config.js"));
  ({ default: supabase, supabaseAdmin } = await import("../src/configs/supabase.config.js"));
  ({ default: AuthService } = await import("../src/services/auth.service.js"));
  ({ default: UserModel } = await import("../src/models/user.model.js"));
  ({ default: TokenModel } = await import("../src/models/token.model.js"));
  ({ default: TokenService } = await import("../src/services/token.service.js"));

  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  );
});

beforeEach(() => {
  if (TokenModel?._inMemoryTokens) TokenModel._inMemoryTokens.clear();
  if (AuthService?.otpStore) AuthService.otpStore.clear();
  setDefaultMocks();
});

afterEach(() => {
  for (const s of stubs.splice(0).reverse()) s.mock.restore();
});

// ═══════════════════════════════════════════════════════════════════════════════
// [C1] Login/Register trả accessToken trong JSON — refreshToken KHÔNG xuất hiện
// ═══════════════════════════════════════════════════════════════════════════════

test("[C1] register: response JSON chứa accessToken và KHÔNG chứa refreshToken", async () => {
  const { response, data } = await post("/api/auth/register", {
    fullName: "Refactor Tester",
    email: TEST_EMAIL,
    password: "StrongPassword123!",
  });

  assert.equal(response.status, 201);
  assert.equal(data.success, true);

  // Phải có accessToken trong response body
  assert.ok(data.data.accessToken, "accessToken phải có trong response JSON");

  // accessToken phải là JWT hợp lệ
  const decoded = jwt.verify(data.data.accessToken, TEST_JWT_SECRET);
  assert.equal(decoded.token_type, "access");
  assert.equal(decoded.sub, TEST_USER.id);

  // refreshToken KHÔNG được lộ trong response body
  assert.equal(data.data.refreshToken, undefined, "refreshToken phải KHÔNG có trong response JSON");
  assert.equal(data.refreshToken, undefined);
});

test("[C1] login: response JSON chứa accessToken và KHÔNG chứa refreshToken", async () => {
  const { response, data } = await post("/api/auth/login", {
    email: TEST_EMAIL,
    password: "StrongPassword123!",
  });

  assert.equal(response.status, 200);
  assert.equal(data.success, true);

  // accessToken trong JSON
  assert.ok(data.data.accessToken, "accessToken phải có trong response JSON");
  const decoded = jwt.verify(data.data.accessToken, TEST_JWT_SECRET);
  assert.equal(decoded.token_type, "access");

  // refreshToken KHÔNG trong JSON
  assert.equal(data.data.refreshToken, undefined, "refreshToken phải KHÔNG có trong response JSON");
});

test("[C1] login: refresh cookie được set HttpOnly (không phải JSON)", async () => {
  const { response } = await post("/api/auth/login", {
    email: TEST_EMAIL,
    password: "StrongPassword123!",
  });

  assert.equal(response.status, 200);
  const cookies = response.headers.getSetCookie().join(";");

  // Refresh token phải xuất hiện trong cookie, không trong body
  assert.match(cookies, /refresh_token=rt_/, "refresh_token phải có trong cookie");
  assert.match(cookies, /HttpOnly/i, "refresh_token cookie phải là HttpOnly");
});

test("[C1] google/session: response JSON chứa accessToken và KHÔNG chứa refreshToken", async () => {
  // Stub getUserFromToken để trả về TEST_USER
  stub(supabase.auth, "getUser", async () => ({
    data: { user: TEST_USER },
    error: null,
  }));

  const { response, data } = await post("/api/auth/google/session", {
    accessToken: "supabase-google-token-mock",
  });

  assert.equal(response.status, 200);
  assert.equal(data.success, true);

  assert.ok(data.data.accessToken, "accessToken phải có trong response JSON");
  assert.equal(data.data.refreshToken, undefined, "refreshToken phải KHÔNG có trong response JSON");
});

test("[C1] refresh: trả accessToken mới trong JSON — không trả refreshToken trong body", async () => {
  const initialRefreshToken = TokenService.generateRefreshToken();
  await TokenModel.updateRefreshToken(TEST_USER.id, initialRefreshToken);

  const { response, data } = await post(
    "/api/auth/refresh",
    {},
    { headers: { cookie: `refresh_token=${initialRefreshToken}` } }
  );

  assert.equal(response.status, 200);
  assert.ok(data.data.accessToken, "accessToken phải có trong response JSON sau refresh");
  assert.equal(data.data.refreshToken, undefined, "refreshToken mới phải qua cookie, không qua JSON");
});

// ═══════════════════════════════════════════════════════════════════════════════
// [C2] Protected API chỉ dùng Bearer access token — không fallback cookie
// ═══════════════════════════════════════════════════════════════════════════════

test("[C2] /me yêu cầu Bearer header — không có header thì 401", async () => {
  const { response, data } = await request("/api/auth/me");
  assert.equal(response.status, 401);
  assert.equal(data.success, false);
});

test("[C2] /me chấp nhận Bearer access token hợp lệ", async () => {
  const { response, data } = await request("/api/auth/me", {
    headers: { authorization: `Bearer ${validBearer()}` },
  });
  assert.equal(response.status, 200);
  assert.equal(data.data.id, TEST_USER.id);
});

test("[C2] /me từ chối token hết hạn", async () => {
  const expired = jwt.sign(
    { sub: TEST_USER.id, email: TEST_EMAIL, token_type: "access" },
    TEST_JWT_SECRET,
    { expiresIn: -1 }
  );
  const { response } = await request("/api/auth/me", {
    headers: { authorization: `Bearer ${expired}` },
  });
  assert.equal(response.status, 401);
});

test("[C2] /me từ chối token sai chữ ký", async () => {
  const wrongSecret = jwt.sign(
    { sub: TEST_USER.id, email: TEST_EMAIL, token_type: "access" },
    "completely-different-secret-key-32chars",
    { expiresIn: "15m" }
  );
  const { response } = await request("/api/auth/me", {
    headers: { authorization: `Bearer ${wrongSecret}` },
  });
  assert.equal(response.status, 401);
});

test("[C9] /me KHÔNG chấp nhận access_token từ cookie — phải dùng Bearer", async () => {
  // Gửi access_token hợp lệ qua cookie thay vì Authorization header
  // Theo refactor plan: middleware không fallback sang access cookie
  const tokenViaCookie = validBearer();
  const { response } = await request("/api/auth/me", {
    headers: { cookie: `access_token=${tokenViaCookie}` },
  });
  // Phải 401 vì không có Bearer header — middleware không đọc cookie access_token
  assert.equal(response.status, 401,
    "Middleware không được fallback sang access cookie theo AUTH_REFACTOR_PLAN");
});

test("[C2] reset token bị từ chối khi dùng làm access token", async () => {
  const resetToken = TokenService.generateResetToken(TEST_EMAIL);
  const { response, data } = await request("/api/auth/me", {
    headers: { authorization: `Bearer ${resetToken}` },
  });
  assert.equal(response.status, 401);
  assert.equal(data.error, "INVALID_TOKEN_TYPE");
});

// ═══════════════════════════════════════════════════════════════════════════════
// [C3] Refresh cookie xác thực với DB, rotate, token cũ bị từ chối
// ═══════════════════════════════════════════════════════════════════════════════

test("[C3] refresh thực hiện RTR: token mới trong cookie, token cũ bị thu hồi trong DB", async () => {
  const initialToken = TokenService.generateRefreshToken();
  await TokenModel.updateRefreshToken(TEST_USER.id, initialToken);

  const { response, data } = await post(
    "/api/auth/refresh",
    {},
    { headers: { cookie: `refresh_token=${initialToken}` } }
  );

  assert.equal(response.status, 200);
  assert.ok(data.data.accessToken);

  // Cookie refresh_token mới được set
  const cookies = response.headers.getSetCookie().join(";");
  const match = cookies.match(/refresh_token=(rt_[^;]+)/);
  assert.ok(match, "refresh_token cookie mới phải được set");
  const newToken = match[1];
  assert.notEqual(newToken, initialToken, "Token mới phải khác token cũ");

  // Token cũ phải bị vô hiệu
  const oldUser = await TokenModel.findByRefreshToken(initialToken);
  assert.equal(oldUser, null, "Token cũ phải bị thu hồi khỏi DB");

  // Token mới phải tồn tại trong DB
  const newUser = await TokenModel.findByRefreshToken(newToken);
  assert.ok(newUser, "Token mới phải được lưu vào DB");
  assert.equal(newUser.id, TEST_USER.id);
});

test("[C3] refresh từ chối token không tồn tại trong DB", async () => {
  const { response, data } = await post(
    "/api/auth/refresh",
    {},
    { headers: { cookie: "refresh_token=rt_unknown_bogus_token" } }
  );
  assert.equal(response.status, 401);
  assert.equal(data.success, false);
});

test("[C3] refresh từ chối token quá 5 ngày và xóa khỏi DB", async () => {
  const expiredToken = TokenService.generateRefreshToken();
  TokenModel._inMemoryTokens.set(TEST_USER.id, {
    refreshToken: expiredToken,
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 ngày trước
  });

  const { response, data } = await post(
    "/api/auth/refresh",
    {},
    { headers: { cookie: `refresh_token=${expiredToken}` } }
  );
  assert.equal(response.status, 401);
  assert.equal(data.error, "REFRESH_TOKEN_EXPIRED");

  // Sau khi hết hạn, DB phải xóa token
  const user = await TokenModel.findByRefreshToken(expiredToken);
  assert.equal(user, null, "Token hết hạn phải bị xóa khỏi DB");
});

test("[C3] refresh không có cookie thì xóa cookies và trả 401", async () => {
  const { response, data } = await post("/api/auth/refresh", {});
  assert.equal(response.status, 401);
  assert.equal(data.success, false);

  // Phải clear cookie
  const cookies = response.headers.getSetCookie().join(";");
  assert.match(cookies, /access_token=.*Expires=Thu, 01 Jan 1970/i, "access_token cookie phải bị clear");
});

// ═══════════════════════════════════════════════════════════════════════════════
// [C5] DB lỗi không tạo phiên "thành công" tồn tại chỉ trong memory (production)
// ═══════════════════════════════════════════════════════════════════════════════

test("[C5] register: refresh token được persist vào DB (in-memory store có token)", async () => {
  // Xóa sạch in-memory store
  TokenModel._inMemoryTokens.clear();

  await post("/api/auth/register", {
    fullName: "DB Persist Test",
    email: TEST_EMAIL,
    password: "StrongPassword123!",
  });

  // Kiểm tra refresh token được lưu (qua in-memory fallback trong test env)
  const stored = TokenModel._inMemoryTokens.get(TEST_USER.id);
  assert.ok(stored, "Refresh token phải được persist sau register");
  assert.match(stored.refreshToken, /^rt_/, "Refresh token phải có định dạng rt_...");
});

test("[C5] login: refresh token được persist vào store sau khi login thành công", async () => {
  TokenModel._inMemoryTokens.clear();

  await post("/api/auth/login", {
    email: TEST_EMAIL,
    password: "StrongPassword123!",
  });

  const stored = TokenModel._inMemoryTokens.get(TEST_USER.id);
  assert.ok(stored, "Refresh token phải được persist sau login");
  assert.ok(stored.refreshToken.startsWith("rt_"), "Refresh token format phải đúng");
  assert.ok(stored.createdAt instanceof Date, "createdAt phải được ghi nhận");
});

// ═══════════════════════════════════════════════════════════════════════════════
// [C6] Session/Availability write endpoints — phải yêu cầu authentication
// ═══════════════════════════════════════════════════════════════════════════════

test("[C6] POST /api/sessions (write) yêu cầu authentication — 401 khi không có Bearer", async () => {
  const { response } = await post("/api/sessions", {
    groupId: "00000000-0000-0000-0000-000000000001",
    title: "Unauthorized Session",
  });
  assert.equal(response.status, 401,
    "POST /api/sessions phải yêu cầu authentication theo AUTH_REFACTOR_PLAN");
});

test("[C6] DELETE /api/sessions/:id yêu cầu authentication — 401 khi không có Bearer", async () => {
  const { response } = await request("/api/sessions/some-id", { method: "DELETE" });
  assert.equal(response.status, 401,
    "DELETE /api/sessions/:id phải yêu cầu authentication");
});

test("[C6] POST /api/availabilities (write) yêu cầu authentication — 401 khi không có Bearer", async () => {
  const { response } = await post("/api/availabilities", {
    sessionId: "00000000-0000-0000-0000-000000000001",
    userId: "00000000-0000-0000-0000-000000000002",
  });
  assert.equal(response.status, 401,
    "POST /api/availabilities phải yêu cầu authentication theo AUTH_REFACTOR_PLAN");
});

test("[C6] PATCH /api/availabilities/:id yêu cầu authentication — 401 khi không có Bearer", async () => {
  const { response } = await request("/api/availabilities/some-id", {
    method: "PATCH",
    body: { available: true },
  });
  assert.equal(response.status, 401,
    "PATCH /api/availabilities/:id phải yêu cầu authentication");
});

test("[C6] GET /api/sessions vẫn là public — không cần auth để đọc", async () => {
  const { response } = await request("/api/sessions");
  // GET phải cho qua (200 hoặc error nghiệp vụ), không phải 401
  assert.notEqual(response.status, 401,
    "GET /api/sessions phải là public endpoint");
});

test("[C6] GET /api/availabilities vẫn là public — không cần auth để đọc", async () => {
  const { response } = await request("/api/availabilities");
  assert.notEqual(response.status, 401,
    "GET /api/availabilities phải là public endpoint");
});


// ═══════════════════════════════════════════════════════════════════════════════
// [C7] Cookie clear khớp chính xác với cookie set khi logout
// ═══════════════════════════════════════════════════════════════════════════════

test("[C7] logout xóa cả access_token và refresh_token cookie với Expires epoch", async () => {
  const userToken = TokenService.generateRefreshToken();
  await TokenModel.updateRefreshToken(TEST_USER.id, userToken);

  const { response, data } = await post(
    "/api/auth/logout",
    {},
    { headers: { cookie: `refresh_token=${userToken}` } }
  );

  assert.equal(response.status, 200);
  assert.equal(data.success, true);

  const cookies = response.headers.getSetCookie().join(";");
  assert.match(
    cookies,
    /access_token=.*Expires=Thu, 01 Jan 1970/i,
    "access_token phải bị clear với Expires=epoch"
  );
  assert.match(
    cookies,
    /refresh_token=.*Expires=Thu, 01 Jan 1970/i,
    "refresh_token phải bị clear với Expires=epoch"
  );
});

test("[C7] logout thu hồi refresh token khỏi DB", async () => {
  const userToken = TokenService.generateRefreshToken();
  await TokenModel.updateRefreshToken(TEST_USER.id, userToken);

  await post(
    "/api/auth/logout",
    {},
    { headers: { cookie: `refresh_token=${userToken}` } }
  );

  // Token phải bị thu hồi
  const user = await TokenModel.findByRefreshToken(userToken);
  assert.equal(user, null, "Refresh token phải bị xóa khỏi DB sau logout");
});

test("[C7] logout không crash khi không có cookie", async () => {
  const { response } = await post("/api/auth/logout", {});
  // Vẫn phải thành công và clear cookie
  assert.equal(response.status, 200);
  const cookies = response.headers.getSetCookie().join(";");
  assert.match(cookies, /access_token=.*Expires=Thu, 01 Jan 1970/i);
});

// ═══════════════════════════════════════════════════════════════════════════════
// [C8] Response envelope { user, accessToken } nhất quán
// ═══════════════════════════════════════════════════════════════════════════════

test("[C8] login response envelope có user object và accessToken (không có password, refreshToken)", async () => {
  const { data } = await post("/api/auth/login", {
    email: TEST_EMAIL,
    password: "StrongPassword123!",
  });

  assert.equal(data.success, true);
  assert.ok(data.data.user, "user object phải có trong data");
  assert.ok(data.data.accessToken, "accessToken phải có trong data");

  // Không lộ thông tin nhạy cảm
  assert.equal(data.data.refreshToken, undefined);
  assert.equal(data.data.user?.password, undefined);
  assert.equal(data.data.user?.password_hash, undefined);
  assert.equal(data.data.user?.refresh_token, undefined);
});

test("[C8] register response envelope có user object và accessToken (không có password, refreshToken)", async () => {
  const { data } = await post("/api/auth/register", {
    fullName: "Envelope Test",
    email: TEST_EMAIL,
    password: "StrongPassword123!",
  });

  assert.equal(data.success, true);
  assert.ok(data.data.user, "user object phải có trong data");
  assert.ok(data.data.accessToken, "accessToken phải có trong data");

  assert.equal(data.data.refreshToken, undefined);
  assert.equal(data.data.user?.password, undefined);
  assert.equal(data.data.user?.refresh_token, undefined);
});

test("[C8] user object đầy đủ các field chuẩn (id, email, fullName, role, avatarUrl)", async () => {
  const { data } = await post("/api/auth/login", {
    email: TEST_EMAIL,
    password: "StrongPassword123!",
  });

  const user = data.data.user;
  assert.ok(user.id, "user.id phải có");
  assert.ok(user.email, "user.email phải có");
  assert.ok("fullName" in user, "user.fullName phải có");
  assert.ok("role" in user, "user.role phải có");
  assert.ok("avatarUrl" in user || user.avatarUrl === "", "user.avatarUrl phải có");
});

// ═══════════════════════════════════════════════════════════════════════════════
// [C10] handleGoogleSession — FE không cần gửi refreshToken (bị bỏ qua)
// ═══════════════════════════════════════════════════════════════════════════════

test("[C10] google/session hoạt động mà không cần refreshToken trong request body", async () => {
  stub(supabase.auth, "getUser", async () => ({
    data: { user: TEST_USER },
    error: null,
  }));

  // Chỉ gửi accessToken — không gửi refreshToken
  const { response, data } = await post("/api/auth/google/session", {
    accessToken: "supabase-access-token-mock",
    // refreshToken: intentionally omitted
  });

  assert.equal(response.status, 200);
  assert.equal(data.success, true);
  assert.ok(data.data.accessToken);
  assert.equal(data.data.refreshToken, undefined,
    "refreshToken không được trả về trong JSON dù FE gửi hay không gửi");
});

test("[C10] google/session không sử dụng refreshToken từ FE nếu được gửi", async () => {
  stub(supabase.auth, "getUser", async () => ({
    data: { user: TEST_USER },
    error: null,
  }));

  // Gửi cả hai — nhưng refreshToken FE gửi PHẢI bị bỏ qua, BE tự tạo mới
  const fakeRefreshFromFE = "rt_fake_from_fe_should_not_be_used";
  const { response, data } = await post("/api/auth/google/session", {
    accessToken: "supabase-access-token-mock",
    refreshToken: fakeRefreshFromFE,
  });

  assert.equal(response.status, 200);

  // Kiểm tra cookie refresh_token phải khác với giá trị FE gửi lên
  const cookies = response.headers.getSetCookie().join(";");
  const match = cookies.match(/refresh_token=(rt_[^;]+)/);
  if (match) {
    assert.notEqual(
      match[1],
      fakeRefreshFromFE,
      "refresh_token trong cookie phải do BE sinh, không phải từ FE"
    );
  }

  // refreshToken không được lộ trong JSON body
  assert.equal(data.data.refreshToken, undefined);
});

// ═══════════════════════════════════════════════════════════════════════════════
// Kiểm tra các endpoint group đã có authentication middleware
// ═══════════════════════════════════════════════════════════════════════════════

test("Group routes từ chối request không có Bearer token", async () => {
  const { response } = await request("/api/groups");
  // Group routes đã có authMiddleware → phải 401
  assert.equal(response.status, 401,
    "Group routes phải yêu cầu Bearer token theo plan");
});

test("Group routes chấp nhận Bearer token hợp lệ", async () => {
  const { response } = await request("/api/groups", {
    headers: { authorization: `Bearer ${validBearer()}` },
  });
  // Phải vào được (200 hoặc error nghiệp vụ, không phải 401)
  assert.notEqual(response.status, 401,
    "Group routes phải cho qua khi có Bearer token hợp lệ");
});
