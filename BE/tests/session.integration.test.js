import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { once } from "node:events";
import jwt from "jsonwebtoken";

const TEST_JWT_SECRET = "session-integration-test-secret-at-least-32-chars";

const OWNER_USER = {
  id: "a1000000-0000-0000-0000-000000000001",
  email: "session-owner@example.com",
  full_name: "Session Owner",
  role: "authenticated",
};
const MEMBER_USER = {
  id: "a2000000-0000-0000-0000-000000000002",
  email: "session-member@example.com",
  full_name: "Session Member",
  role: "authenticated",
};
const OUTSIDER_USER = {
  id: "a3000000-0000-0000-0000-000000000003",
  email: "session-outsider@example.com",
  full_name: "Session Outsider",
  role: "authenticated",
};

let app, UserModel, query, server, baseUrl;

function makeToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: "authenticated", token_type: "access" },
    TEST_JWT_SECRET,
    { expiresIn: "5m", issuer: "whosfree-api", audience: "whosfree-client" }
  );
}

async function request(path, { method = "GET", body, token } = {}) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { response: res, data: await res.json() };
}

before(async () => {
  // Load DATABASE_URL từ .env trước, rồi override JWT secrets cho môi trường test
  const { default: dotenv } = await import("dotenv");
  dotenv.config();

  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = "refresh-secret-min-32-characters-long";
  process.env.CLIENT_ORIGIN = "http://localhost:5173";

  ({ default: app } = await import("../src/app.js"));
  ({ default: UserModel } = await import("../src/models/user.model.js"));
  ({ query } = await import("../src/configs/db.config.js"));

  for (const u of [OWNER_USER, MEMBER_USER, OUTSIDER_USER]) {
    await query(
      `INSERT INTO public.users (id, email, full_name, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;`,
      [u.id, u.email, u.full_name]
    );
  }

  UserModel.findById = async (id) => {
    if (id === OWNER_USER.id) return OWNER_USER;
    if (id === MEMBER_USER.id) return MEMBER_USER;
    if (id === OUTSIDER_USER.id) return OUTSIDER_USER;
    return null;
  };
  UserModel.findByEmail = async (email) => {
    const e = (email || "").toLowerCase();
    if (e === OWNER_USER.email) return OWNER_USER;
    if (e === MEMBER_USER.email) return MEMBER_USER;
    if (e === OUTSIDER_USER.email) return OUTSIDER_USER;
    return null;
  };

  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await query(
    `DELETE FROM public.groups WHERE created_by IN ($1, $2, $3);`,
    [OWNER_USER.id, MEMBER_USER.id, OUTSIDER_USER.id]
  );
  await new Promise((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  );
});

// ─── Setup: tạo group với 2 thành viên (owner + member) qua API ─────────────

let groupId;

beforeEach(async () => {
  await query(
    `DELETE FROM public.groups WHERE created_by IN ($1, $2, $3);`,
    [OWNER_USER.id, MEMBER_USER.id, OUTSIDER_USER.id]
  );

  const ownerToken = makeToken(OWNER_USER);

  // Tạo group (owner tự động được thêm vào với role owner)
  const { data: groupRes } = await request("/api/groups", {
    method: "POST",
    token: ownerToken,
    body: { name: "Session Test Group" },
  });
  groupId = groupRes.data?.id ?? groupRes.id;

  // Thêm member — group hiện có 2 người
  await request(`/api/groups/${groupId}/members`, {
    method: "POST",
    token: ownerToken,
    body: { userId: MEMBER_USER.id, role: "member", groupRole: "core" },
  });
});

// ─── Tests ───────────────────────────────────────────────────────────────────

test("POST /api/sessions — totalMembers phản ánh số thành viên thực (2), không phải hardcoded 3", async () => {
  const token = makeToken(OWNER_USER);
  const { response, data } = await request("/api/sessions", {
    method: "POST",
    token,
    body: { groupId, title: "Họp nhóm tuần 1" },
  });

  assert.equal(response.status, 201);
  const session = data.data ?? data;
  assert.equal(session.totalMembers, 2, "Group có 2 members → totalMembers phải là 2, không phải 3");
  assert.equal(session.respondedCount, 0, "Session mới tạo chưa có ai phản hồi");
  assert.equal(session.quorumPercent, 0);
});

test("POST /api/sessions — FE payload với totalMembers:3 bị ignore, trả về giá trị thực", async () => {
  const token = makeToken(OWNER_USER);
  const { response, data } = await request("/api/sessions", {
    method: "POST",
    token,
    body: {
      groupId,
      title: "Test ignore hardcoded",
      // Giả lập FE cũ gửi lên hardcoded values — BE phải ignore hết
      totalMembers: 3,
      respondedCount: 99,
      quorumPercent: 100,
      highestOverlapText: "fake text",
      sparkline: [1, 2, 3, 4, 5],
    },
  });

  assert.equal(response.status, 201);
  const session = data.data ?? data;
  assert.equal(session.totalMembers, 2, "BE ignore totalMembers:3 từ FE, tính từ group_members");
  assert.equal(session.respondedCount, 0, "respondedCount phải là 0, không phải 99");
  assert.equal(session.quorumPercent, 0, "quorumPercent phải là 0, không phải 100");
});

test("POST /api/sessions — 401 nếu không có token", async () => {
  const { response } = await request("/api/sessions", {
    method: "POST",
    body: { groupId, title: "Unauthorized session" },
  });
  assert.equal(response.status, 401);
});

test("GET /api/sessions?groupId — totalMembers đúng cho mọi session trong list", async () => {
  const token = makeToken(OWNER_USER);

  await request("/api/sessions", { method: "POST", token, body: { groupId, title: "Session A" } });
  await request("/api/sessions", { method: "POST", token, body: { groupId, title: "Session B" } });

  const { response, data } = await request(`/api/sessions?groupId=${groupId}`, { token });

  assert.equal(response.status, 200);
  const sessions = Array.isArray(data) ? data : (data.data ?? []);
  assert.ok(sessions.length >= 2, "Phải có ít nhất 2 session");
  for (const s of sessions) {
    assert.equal(s.totalMembers, 2, `Session "${s.title}" phải có totalMembers = 2`);
  }
});
