import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { once } from "node:events";
import jwt from "jsonwebtoken";

const TEST_JWT_SECRET = "session-integration-test-secret-at-least-32-chars";

const OWNER_USER = {
  id: "a1000000-0000-0000-0000-0000000000f1",
  email: "final-owner@example.com",
  full_name: "Session Owner",
  role: "authenticated",
};
const MEMBER_USER = {
  id: "a2000000-0000-0000-0000-0000000000f2",
  email: "final-member@example.com",
  full_name: "Session Member",
  role: "authenticated",
};
const OUTSIDER_USER = {
  id: "a3000000-0000-0000-0000-0000000000f3",
  email: "final-outsider@example.com",
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

async function createSessionWithSlots() {
  const ownerToken = makeToken(OWNER_USER);
  const memberToken = makeToken(MEMBER_USER);
  const { data } = await request("/api/sessions", {
    method: "POST",
    token: ownerToken,
    body: { groupId, title: "Chốt lịch thử" },
  });
  const session = data.data ?? data;
  const slot = (startMinutes, endMinutes) => ({ dayIndex: 1, dateStr: "2026-09-08", startMinutes, endMinutes });
  await request(`/api/sessions/${session.id}/my-availability`, {
    method: "PUT",
    token: ownerToken,
    body: { slots: [slot(780, 840)] },
  });
  await request(`/api/sessions/${session.id}/my-availability`, {
    method: "PUT",
    token: memberToken,
    body: { slots: [slot(780, 810)] },
  });
  return session;
}

test("finalize — chỉ lead/owner, giờ phải nằm trong giờ đã chọn, sau đó khoá chỉnh sửa và mở khoá được", async () => {
  const ownerToken = makeToken(OWNER_USER);
  const memberToken = makeToken(MEMBER_USER);
  const session = await createSessionWithSlots();
  const finalizePath = `/api/sessions/${session.id}/finalize`;
  const good = { date: "2026-09-08", startMinutes: 780, endMinutes: 840, note: "Mang máy ảnh" };

  const forbidden = await request(finalizePath, { method: "POST", token: memberToken, body: good });
  assert.equal(forbidden.response.status, 403);

  const bad = await request(finalizePath, { method: "POST", token: ownerToken, body: { ...good, endMinutes: 900 } });
  assert.equal(bad.response.status, 400);

  const ok = await request(finalizePath, { method: "POST", token: ownerToken, body: good });
  assert.equal(ok.response.status, 200);
  const result = ok.data.data ?? ok.data;
  assert.equal(result.session.status, "finalized");
  assert.equal(result.session.finalized.date, "2026-09-08");
  assert.equal(result.session.finalized.startMinutes, 780);
  assert.equal(result.session.finalized.endMinutes, 840);
  assert.equal(result.email.total, 2);

  const again = await request(finalizePath, { method: "POST", token: ownerToken, body: good });
  assert.equal(again.response.status, 409);

  const locked = await request(`/api/sessions/${session.id}/my-availability`, {
    method: "PUT",
    token: memberToken,
    body: { slots: [] },
  });
  assert.equal(locked.response.status, 409);

  const memberUnlock = await request(`/api/sessions/${session.id}/unfinalize`, { method: "POST", token: memberToken });
  assert.equal(memberUnlock.response.status, 403);

  const open = await request(`/api/sessions/${session.id}/unfinalize`, { method: "POST", token: ownerToken });
  assert.equal(open.response.status, 200);
  assert.equal((open.data.data ?? open.data).status, "active_poll");
});

test("export.xlsx — lead tải được file xlsx, member bị từ chối", async () => {
  const session = await createSessionWithSlots();
  const url = `${baseUrl}/api/sessions/${session.id}/export.xlsx`;

  const denied = await fetch(url, { headers: { Authorization: `Bearer ${makeToken(MEMBER_USER)}` } });
  assert.equal(denied.status, 403);

  const res = await fetch(url, { headers: { Authorization: `Bearer ${makeToken(OWNER_USER)}` } });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /spreadsheetml/);
  const bytes = Buffer.from(await res.arrayBuffer());
  assert.equal(bytes.subarray(0, 2).toString(), "PK");
});

test("availabilities — dateStr trả về đúng ngày đã lưu (không lệch múi giờ)", async () => {
  const session = await createSessionWithSlots();
  const { data } = await request(`/api/sessions/${session.id}/availabilities`, { token: makeToken(OWNER_USER) });
  const members = data.data ?? data;
  assert.ok(members.length > 0);
  for (const member of members) {
    for (const slot of member.slots) assert.equal(slot.dateStr, "2026-09-08");
  }
});
