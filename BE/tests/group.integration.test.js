import assert from "node:assert/strict";
import { after, before, beforeEach, mock, test } from "node:test";
import { once } from "node:events";
import jwt from "jsonwebtoken";

const TEST_JWT_SECRET = "group-integration-test-secret-at-least-32-characters";

const OWNER_USER = {
  id: "10000000-0000-0000-0000-000000000001",
  email: "owner@example.com",
  user_metadata: { full_name: "Group Owner" },
  role: "authenticated",
};
const LEAD_USER = {
  id: "20000000-0000-0000-0000-000000000002",
  email: "lead@example.com",
  user_metadata: { full_name: "Group Lead" },
  role: "authenticated",
};
const MEMBER_USER = {
  id: "30000000-0000-0000-0000-000000000003",
  email: "member@example.com",
  user_metadata: { full_name: "Group Member" },
  role: "authenticated",
};
const OUTSIDER_USER = {
  id: "40000000-0000-0000-0000-000000000004",
  email: "outsider@example.com",
  user_metadata: { full_name: "Group Outsider" },
  role: "authenticated",
};
const TARGET_USER = {
  id: "50000000-0000-0000-0000-000000000005",
  email: "target@example.com",
  user_metadata: { full_name: "Group Target" },
  role: "authenticated",
};

let app;
let GroupModel;
let GroupMemberModel;
let UserModel;
let query;
let server;
let baseUrl;

function createToken(user, expiresIn = "5m") {
  return jwt.sign(
    { sub: user.id, email: user.email, role: "user" },
    TEST_JWT_SECRET,
    { expiresIn }
  );
}

async function request(path, { method = "GET", body, token, rawAuth } = {}) {
  const headers = {};
  if (rawAuth !== undefined) {
    headers["Authorization"] = rawAuth;
  } else if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  return { response, data };
}

before(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = "refresh-secret-min-32-characters-long";
  process.env.CLIENT_ORIGIN = "http://localhost:5173";

  ({ default: app } = await import("../src/app.js"));
  ({ default: GroupModel } = await import("../src/models/group.model.js"));
  ({ default: GroupMemberModel } = await import("../src/models/group-member.model.js"));
  ({ default: UserModel } = await import("../src/models/user.model.js"));
  ({ query } = await import("../src/configs/db.config.js"));

  // Upsert fixture users into public.users database
  for (const u of [OWNER_USER, LEAD_USER, MEMBER_USER, OUTSIDER_USER, TARGET_USER]) {
    await query(
      `INSERT INTO public.users (id, email, full_name, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;`,
      [u.id, u.email, u.user_metadata.full_name]
    );
  }

  // Stub UserModel findById & findByEmail to return fixture records
  UserModel.findById = async (id) => {
    if (id === OWNER_USER.id) return OWNER_USER;
    if (id === LEAD_USER.id) return LEAD_USER;
    if (id === MEMBER_USER.id) return MEMBER_USER;
    if (id === OUTSIDER_USER.id) return OUTSIDER_USER;
    if (id === TARGET_USER.id) return TARGET_USER;
    return null;
  };

  UserModel.findByEmail = async (email) => {
    const normalized = (email || "").toLowerCase();
    if (normalized === OWNER_USER.email) return OWNER_USER;
    if (normalized === LEAD_USER.email) return LEAD_USER;
    if (normalized === MEMBER_USER.email) return MEMBER_USER;
    if (normalized === OUTSIDER_USER.email) return OUTSIDER_USER;
    if (normalized === TARGET_USER.email) return TARGET_USER;
    return null;
  };

  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  // Clean up any remaining test groups
  await query(
    `DELETE FROM public.groups WHERE created_by IN ($1, $2, $3, $4, $5);`,
    [OWNER_USER.id, LEAD_USER.id, MEMBER_USER.id, OUTSIDER_USER.id, TARGET_USER.id]
  );
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
});

beforeEach(async () => {
  await query(
    `DELETE FROM public.groups WHERE created_by IN ($1, $2, $3, $4, $5);`,
    [OWNER_USER.id, LEAD_USER.id, MEMBER_USER.id, OUTSIDER_USER.id, TARGET_USER.id]
  );
});

// Helper: Setup Group A with Owner, Lead, and Member
async function setupGroupA(capacity = 10) {
  const ownerToken = createToken(OWNER_USER);
  const leadToken = createToken(LEAD_USER);
  const memberToken = createToken(MEMBER_USER);
  const outsiderToken = createToken(OUTSIDER_USER);

  const createRes = await request("/api/groups", {
    method: "POST",
    token: ownerToken,
    body: { name: "Group A", capacity },
  });
  const group = createRes.data.data;

  // Add Lead
  await request(`/api/groups/${group.id}/members`, {
    method: "POST",
    token: ownerToken,
    body: { userId: LEAD_USER.id, role: "lead", groupRole: "leadership" },
  });

  // Add Member
  await request(`/api/groups/${group.id}/members`, {
    method: "POST",
    token: ownerToken,
    body: { userId: MEMBER_USER.id, role: "member", groupRole: "core" },
  });

  return {
    group,
    ownerToken,
    leadToken,
    memberToken,
    outsiderToken,
  };
}

// ==========================================
// Authentication and authorization tests
// ==========================================
test("AUTH-01: Call endpoints without Authorization returns 401", async () => {
  const resList = await Promise.all([
    request("/api/groups"),
    request("/api/groups", { method: "POST", body: { name: "No Auth" } }),
    request("/api/groups/00000000-0000-0000-0000-000000000000"),
    request("/api/groups/00000000-0000-0000-0000-000000000000/members"),
  ]);

  for (const { response, data } of resList) {
    assert.equal(response.status, 401);
    assert.equal(data.success, false);
  }
});

test("AUTH-02: Call with malformed Bearer header returns 401", async () => {
  const { response, data } = await request("/api/groups", {
    rawAuth: "NotBearerToken123",
  });
  assert.equal(response.status, 401);
  assert.equal(data.success, false);
});

test("AUTH-03: Call with invalid or expired token returns 401", async () => {
  const expiredToken = createToken(OWNER_USER, "-5s");
  const { response, data } = await request("/api/groups", {
    token: expiredToken,
  });
  assert.equal(response.status, 401);
  assert.equal(data.success, false);
});

test("AUTH-04 & MEMBERS-02: Non-member calling GET /:id/members returns 403", async () => {
  const { group, outsiderToken } = await setupGroupA();
  const { response, data } = await request(`/api/groups/${group.id}/members`, {
    token: outsiderToken,
  });

  assert.equal(response.status, 403);
  assert.equal(data.success, false);
  assert.equal(data.error, "FORBIDDEN");
});

// ==========================================
// POST /api/groups — create group
// ==========================================
test("CREATE-01: Create group with valid name and omitted optional fields", async () => {
  const token = createToken(OWNER_USER);
  const { response, data } = await request("/api/groups", {
    method: "POST",
    token,
    body: { name: "Study Group" },
  });

  assert.equal(response.status, 201);
  assert.equal(data.success, true);
  assert.equal(data.data.name, "Study Group");
  assert.equal(data.data.userRole, "owner");
  assert.equal(data.data.userGroupRole, "leadership");
  assert.equal(data.data.capacity, 10);
  assert.ok(data.data.slug);
});

test("CREATE-02: Create with boundary values (name 2 chars, capacity 2/100)", async () => {
  const token = createToken(OWNER_USER);
  const { response, data } = await request("/api/groups", {
    method: "POST",
    token,
    body: { name: "AB", capacity: 2 },
  });

  assert.equal(response.status, 201);
  assert.equal(data.data.name, "AB");
  assert.equal(data.data.capacity, 2);
});

test("CREATE-03: Missing, blank, 1-character, or >100-character name returns 400", async () => {
  const token = createToken(OWNER_USER);
  const cases = [{}, { name: "" }, { name: " " }, { name: "A" }, { name: "x".repeat(101) }];

  for (const body of cases) {
    const { response, data } = await request("/api/groups", {
      method: "POST",
      token,
      body,
    });
    assert.equal(response.status, 400);
    assert.equal(data.error, "VALIDATION_ERROR");
  }
});

test("CREATE-04: Invalid category, non-integer capacity, capacity <2 or >100 returns 400", async () => {
  const token = createToken(OWNER_USER);
  const cases = [
    { name: "Group 1", category: "unsupported" },
    { name: "Group 2", capacity: "not-a-number" },
    { name: "Group 3", capacity: 1 },
    { name: "Group 4", capacity: 101 },
    { name: "Group 5", description: "a".repeat(501) },
  ];

  for (const body of cases) {
    const { response, data } = await request("/api/groups", {
      method: "POST",
      token,
      body,
    });
    assert.equal(response.status, 400);
    assert.equal(data.error, "VALIDATION_ERROR");
  }
});

test("CREATE-05: Unknown/protected fields (id, createdBy, userRole) are rejected with 400", async () => {
  const token = createToken(OWNER_USER);
  const { response, data } = await request("/api/groups", {
    method: "POST",
    token,
    body: {
      name: "Exploit Group",
      createdBy: "00000000-0000-0000-0000-000000000000",
      userRole: "admin",
    },
  });

  assert.equal(response.status, 400);
  assert.equal(data.error, "VALIDATION_ERROR");
});

test("CREATE-06: Create multiple groups with same name produces distinct slugs", async () => {
  const token = createToken(OWNER_USER);
  const res1 = await request("/api/groups", {
    method: "POST",
    token,
    body: { name: "Same Name Team" },
  });
  const res2 = await request("/api/groups", {
    method: "POST",
    token,
    body: { name: "Same Name Team" },
  });

  assert.equal(res1.response.status, 201);
  assert.equal(res2.response.status, 201);
  assert.notEqual(res1.data.data.slug, res2.data.data.slug);
});

test("CREATE-07: Transaction rollback if creator membership fails", async () => {
  const token = createToken(OWNER_USER);

  // Mock GroupModel.createWithLeader to simulate membership insertion failure
  const originalCreateWithLeader = GroupModel.createWithLeader;
  mock.method(GroupModel, "createWithLeader", async () => {
    throw new Error("Simulated membership creation failure");
  });

  try {
    const { response } = await request("/api/groups", {
      method: "POST",
      token,
      body: { name: "Rollback Group Test" },
    });
    assert.equal(response.status, 500);

    // Verify group was not persisted
    const checkRes = await query("SELECT * FROM public.groups WHERE name = $1;", ["Rollback Group Test"]);
    assert.equal(checkRes.rows.length, 0);
  } finally {
    mock.restoreAll();
  }
});

// ==========================================
// GET /api/groups — list caller's groups
// ==========================================
test("LIST-01: Owner lists groups returns only groups where they are member and includes memberPreviews up to 3", async () => {
  const { group, ownerToken } = await setupGroupA();
  const { response, data } = await request("/api/groups", { token: ownerToken });

  assert.equal(response.status, 200);
  assert.equal(data.data.length, 1);
  assert.equal(data.data[0].id, group.id);
  assert.equal(data.data[0].userRole, "owner");
  assert.equal(data.data[0].memberCount, 3);
  assert.equal(Array.isArray(data.data[0].memberPreviews), true);
  assert.equal(data.data[0].memberPreviews.length, 3);
  assert.equal(data.data[0].memberPreviews[0].name, "Group Owner");
  assert.equal(data.data[0].memberPreviews[1].name, "Group Lead");
  assert.equal(data.data[0].memberPreviews[2].name, "Group Member");
});

test("LIST-02: User belonging to no groups receives empty array []", async () => {
  await setupGroupA();
  const outsiderToken = createToken(OUTSIDER_USER);
  const { response, data } = await request("/api/groups", { token: outsiderToken });

  assert.equal(response.status, 200);
  assert.equal(Array.isArray(data.data), true);
  assert.equal(data.data.length, 0);
});

test("LIST-03 & LIST-04: Multi-group membership and data isolation", async () => {
  const { group: groupA, memberToken } = await setupGroupA();

  // Create Group B owned by LEAD_USER, with MEMBER_USER as lead
  const leadToken = createToken(LEAD_USER);
  const createB = await request("/api/groups", {
    method: "POST",
    token: leadToken,
    body: { name: "Group B" },
  });
  const groupB = createB.data.data;

  await request(`/api/groups/${groupB.id}/members`, {
    method: "POST",
    token: leadToken,
    body: { userId: MEMBER_USER.id, role: "lead", groupRole: "leadership" },
  });

  // Create Group C owned by OUTSIDER_USER (MEMBER_USER is not in it)
  const outsiderToken = createToken(OUTSIDER_USER);
  await request("/api/groups", {
    method: "POST",
    token: outsiderToken,
    body: { name: "Group C" },
  });

  // Fetch groups as MEMBER_USER
  const { response, data } = await request("/api/groups", { token: memberToken });
  assert.equal(response.status, 200);
  assert.equal(data.data.length, 2);

  const returnedIds = data.data.map((g) => g.id);
  assert.ok(returnedIds.includes(groupA.id));
  assert.ok(returnedIds.includes(groupB.id));

  // Verify roles in each group
  const inA = data.data.find((g) => g.id === groupA.id);
  const inB = data.data.find((g) => g.id === groupB.id);
  assert.equal(inA.userRole, "member");
  assert.equal(inB.userRole, "lead");
});

// ==========================================
// GET /api/groups/:id — detail
// ==========================================
test("DETAIL-01 & DETAIL-02: Fetch by UUID and slug", async () => {
  const { group, ownerToken } = await setupGroupA();

  const byId = await request(`/api/groups/${group.id}`, { token: ownerToken });
  assert.equal(byId.response.status, 200);
  assert.equal(byId.data.data.name, "Group A");

  const bySlug = await request(`/api/groups/${group.slug}`, { token: ownerToken });
  assert.equal(bySlug.response.status, 200);
  assert.equal(bySlug.data.data.id, group.id);
});

test("DETAIL-03: Fetch unknown UUID/slug returns 404 GROUP_NOT_FOUND", async () => {
  const token = createToken(OWNER_USER);
  const { response, data } = await request("/api/groups/00000000-0000-0000-0000-000000000000", {
    token,
  });
  assert.equal(response.status, 404);
  assert.equal(data.error, "GROUP_NOT_FOUND");
});

test("DETAIL-04: Authenticated non-member fetches group detail returns guest userRole", async () => {
  const { group, outsiderToken } = await setupGroupA();
  const { response, data } = await request(`/api/groups/${group.id}`, { token: outsiderToken });

  assert.equal(response.status, 200);
  assert.equal(data.data.id, group.id);
  assert.equal(data.data.userRole, "guest");
});

// ==========================================
// PATCH /api/groups/:id — update
// ==========================================
test("UPDATE-01 & UPDATE-02: Owner and Lead can update valid fields", async () => {
  const { group, ownerToken, leadToken } = await setupGroupA();

  // Owner updates description
  const resOwner = await request(`/api/groups/${group.id}`, {
    method: "PATCH",
    token: ownerToken,
    body: { description: "Updated by Owner" },
  });
  assert.equal(resOwner.response.status, 200);
  assert.equal(resOwner.data.data.description, "Updated by Owner");

  // Lead updates name
  const resLead = await request(`/api/groups/${group.id}`, {
    method: "PATCH",
    token: leadToken,
    body: { name: "Renamed by Lead" },
  });
  assert.equal(resLead.response.status, 200);
  assert.equal(resLead.data.data.name, "Renamed by Lead");
});

test("UPDATE-03: Member or Outsider cannot update group (403)", async () => {
  const { group, memberToken, outsiderToken } = await setupGroupA();

  const resMember = await request(`/api/groups/${group.id}`, {
    method: "PATCH",
    token: memberToken,
    body: { name: "Hacked by Member" },
  });
  assert.equal(resMember.response.status, 403);

  const resOutsider = await request(`/api/groups/${group.id}`, {
    method: "PATCH",
    token: outsiderToken,
    body: { name: "Hacked by Outsider" },
  });
  assert.equal(resOutsider.response.status, 403);
});

test("UPDATE-04: Update non-existent group returns 404", async () => {
  const token = createToken(OWNER_USER);
  const { response, data } = await request("/api/groups/00000000-0000-0000-0000-000000000000", {
    method: "PATCH",
    token,
    body: { name: "Ghost Group" },
  });
  assert.equal(response.status, 404);
  assert.equal(data.error, "GROUP_NOT_FOUND");
});

test("UPDATE-05: Send invalid capacity or description returns 400", async () => {
  const { group, ownerToken } = await setupGroupA();
  const cases = [{ capacity: 1 }, { capacity: 101 }, { description: "x".repeat(501) }];

  for (const body of cases) {
    const { response, data } = await request(`/api/groups/${group.id}`, {
      method: "PATCH",
      token: ownerToken,
      body,
    });
    assert.equal(response.status, 400);
    assert.equal(data.error, "VALIDATION_ERROR");
  }
});

test("UPDATE-06: Send empty body returns 400 VALIDATION_ERROR", async () => {
  const { group, ownerToken } = await setupGroupA();
  const { response, data } = await request(`/api/groups/${group.id}`, {
    method: "PATCH",
    token: ownerToken,
    body: {},
  });
  assert.equal(response.status, 400);
  assert.equal(data.error, "VALIDATION_ERROR");
});

test("UPDATE-07: Attempting to alter protected fields returns 400", async () => {
  const { group, ownerToken } = await setupGroupA();
  const { response, data } = await request(`/api/groups/${group.id}`, {
    method: "PATCH",
    token: ownerToken,
    body: { id: "00000000-0000-0000-0000-000000000000" },
  });
  assert.equal(response.status, 400);
  assert.equal(data.error, "VALIDATION_ERROR");
});

test("UPDATE-08: Setting capacity below current member count rejects with 400 INVALID_CAPACITY", async () => {
  const { group, ownerToken } = await setupGroupA(5);
  // Group currently has 3 members: Owner, Lead, Member

  const { response, data } = await request(`/api/groups/${group.id}`, {
    method: "PATCH",
    token: ownerToken,
    body: { capacity: 2 }, // lower than 3 current members
  });
  assert.equal(response.status, 400);
  assert.equal(data.error, "INVALID_CAPACITY");
});

// ==========================================
// DELETE /api/groups/:id — delete group
// ==========================================
test("DELETE-01: Owner deletes group returns 200", async () => {
  const { group, ownerToken } = await setupGroupA();
  const { response, data } = await request(`/api/groups/${group.id}`, {
    method: "DELETE",
    token: ownerToken,
  });

  assert.equal(response.status, 200);
  assert.equal(data.success, true);

  // Group should no longer exist
  const check = await request(`/api/groups/${group.id}`, { token: ownerToken });
  assert.equal(check.response.status, 404);
});

test("DELETE-02: Lead, Member, or Outsider cannot delete group (403)", async () => {
  const { group, leadToken, memberToken, outsiderToken } = await setupGroupA();

  const resLead = await request(`/api/groups/${group.id}`, { method: "DELETE", token: leadToken });
  assert.equal(resLead.response.status, 403);

  const resMember = await request(`/api/groups/${group.id}`, { method: "DELETE", token: memberToken });
  assert.equal(resMember.response.status, 403);

  const resOutsider = await request(`/api/groups/${group.id}`, { method: "DELETE", token: outsiderToken });
  assert.equal(resOutsider.response.status, 403);
});

test("DELETE-03: Delete unknown group returns 404", async () => {
  const token = createToken(OWNER_USER);
  const { response, data } = await request("/api/groups/00000000-0000-0000-0000-000000000000", {
    method: "DELETE",
    token,
  });
  assert.equal(response.status, 404);
  assert.equal(data.error, "GROUP_NOT_FOUND");
});

test("DELETE-04: Database delete failure surfaces as 5xx without faking success", async () => {
  const { group, ownerToken } = await setupGroupA();

  mock.method(GroupModel, "delete", async () => {
    throw new Error("Database connection lost");
  });

  try {
    const { response } = await request(`/api/groups/${group.id}`, {
      method: "DELETE",
      token: ownerToken,
    });
    assert.equal(response.status, 500);

    // Group remains intact in database
    const checkRes = await query("SELECT id FROM public.groups WHERE id = $1;", [group.id]);
    assert.equal(checkRes.rows.length, 1);
  } finally {
    mock.restoreAll();
  }
});

// ==========================================
// GET /api/groups/:id/members — list members
// ==========================================
test("MEMBERS-01: Owner, Lead, and Member can all list members", async () => {
  const { group, ownerToken, leadToken, memberToken } = await setupGroupA();

  for (const token of [ownerToken, leadToken, memberToken]) {
    const { response, data } = await request(`/api/groups/${group.id}/members`, { token });
    assert.equal(response.status, 200);
    assert.equal(data.data.length, 3);
    assert.equal(data.data[0].role, "owner");
    assert.equal(data.data[1].role, "lead");
    assert.equal(data.data[2].role, "member");
    assert.ok(data.data[0].user.fullName);
  }
});

test("MEMBERS-03: List members for unknown group returns 404", async () => {
  const token = createToken(OWNER_USER);
  const { response, data } = await request("/api/groups/00000000-0000-0000-0000-000000000000/members", {
    token,
  });
  assert.equal(response.status, 404);
  assert.equal(data.error, "GROUP_NOT_FOUND");
});

// ==========================================
// POST /api/groups/:id/members — add member
// ==========================================
test("ADD-01 & ADD-02: Owner adds by email, Lead adds by userId", async () => {
  const ownerToken = createToken(OWNER_USER);
  const leadToken = createToken(LEAD_USER);

  const createRes = await request("/api/groups", {
    method: "POST",
    token: ownerToken,
    body: { name: "Add Member Group", capacity: 10 },
  });
  const groupId = createRes.data.data.id;

  // Owner adds Lead by email
  const addLead = await request(`/api/groups/${groupId}/members`, {
    method: "POST",
    token: ownerToken,
    body: { email: LEAD_USER.email, role: "lead", groupRole: "leadership" },
  });
  assert.equal(addLead.response.status, 201);
  assert.equal(addLead.data.data.role, "lead");

  // Lead adds Member by userId
  const addMember = await request(`/api/groups/${groupId}/members`, {
    method: "POST",
    token: leadToken,
    body: { userId: MEMBER_USER.id, role: "member" },
  });
  assert.equal(addMember.response.status, 201);
  assert.equal(addMember.data.data.role, "member");
});

test("ADD-03: Member or Outsider cannot add user (403)", async () => {
  const { group, memberToken, outsiderToken } = await setupGroupA();

  const resMember = await request(`/api/groups/${group.id}/members`, {
    method: "POST",
    token: memberToken,
    body: { email: TARGET_USER.email },
  });
  assert.equal(resMember.response.status, 403);

  const resOutsider = await request(`/api/groups/${group.id}/members`, {
    method: "POST",
    token: outsiderToken,
    body: { email: TARGET_USER.email },
  });
  assert.equal(resOutsider.response.status, 403);
});

test("ADD-04: Missing email/userId, malformed email, or malformed userId returns 400", async () => {
  const { group, ownerToken } = await setupGroupA();
  const cases = [
    {},
    { email: "not-an-email" },
    { userId: "not-a-uuid" },
  ];

  for (const body of cases) {
    const { response, data } = await request(`/api/groups/${group.id}/members`, {
      method: "POST",
      token: ownerToken,
      body,
    });
    assert.equal(response.status, 400);
    assert.equal(data.error, "VALIDATION_ERROR");
  }
});

test("ADD-05: Non-existent email or userId returns 404 USER_NOT_FOUND", async () => {
  const { group, ownerToken } = await setupGroupA();

  const resEmail = await request(`/api/groups/${group.id}/members`, {
    method: "POST",
    token: ownerToken,
    body: { email: "ghost@example.com" },
  });
  assert.equal(resEmail.response.status, 404);
  assert.equal(resEmail.data.error, "USER_NOT_FOUND");

  const resId = await request(`/api/groups/${group.id}/members`, {
    method: "POST",
    token: ownerToken,
    body: { userId: "00000000-0000-0000-0000-000000000099" },
  });
  assert.equal(resId.response.status, 404);
  assert.equal(resId.data.error, "USER_NOT_FOUND");
});

test("ADD-06: Target is already a member returns 409 ALREADY_MEMBER and keeps role intact", async () => {
  const { group, ownerToken } = await setupGroupA();

  // Try to re-add MEMBER_USER as lead
  const { response, data } = await request(`/api/groups/${group.id}/members`, {
    method: "POST",
    token: ownerToken,
    body: { userId: MEMBER_USER.id, role: "lead" },
  });
  assert.equal(response.status, 409);
  assert.equal(data.error, "ALREADY_MEMBER");

  // Verify existing role was not overwritten
  const checkMember = await GroupMemberModel.findMember(group.id, MEMBER_USER.id);
  assert.equal(checkMember.role, "member");
});

test("ADD-07 & ADD-08: Capacity enforcement and rejection when full", async () => {
  const ownerToken = createToken(OWNER_USER);
  const createRes = await request("/api/groups", {
    method: "POST",
    token: ownerToken,
    body: { name: "Small Team", capacity: 2 },
  });
  const groupId = createRes.data.data.id;

  // Add 2nd member (capacity is 2, 1 slot remains)
  const addLead = await request(`/api/groups/${groupId}/members`, {
    method: "POST",
    token: ownerToken,
    body: { userId: LEAD_USER.id, role: "lead" },
  });
  assert.equal(addLead.response.status, 201);

  // Attempt to add 3rd member (at capacity)
  const addOver = await request(`/api/groups/${groupId}/members`, {
    method: "POST",
    token: ownerToken,
    body: { userId: MEMBER_USER.id, role: "member" },
  });
  assert.equal(addOver.response.status, 400);
  assert.equal(addOver.data.error, "GROUP_CAPACITY_FULL");
});

test("ADD-09: Concurrent additions competing for final slot do not exceed capacity", async () => {
  const ownerToken = createToken(OWNER_USER);
  const createRes = await request("/api/groups", {
    method: "POST",
    token: ownerToken,
    body: { name: "Race Team", capacity: 2 },
  });
  const groupId = createRes.data.data.id;

  // Two concurrent additions competing for slot #2
  const [res1, res2] = await Promise.all([
    request(`/api/groups/${groupId}/members`, {
      method: "POST",
      token: ownerToken,
      body: { userId: LEAD_USER.id, role: "lead" },
    }),
    request(`/api/groups/${groupId}/members`, {
      method: "POST",
      token: ownerToken,
      body: { userId: MEMBER_USER.id, role: "member" },
    }),
  ]);

  const statuses = [res1.response.status, res2.response.status].sort();
  assert.deepEqual(statuses, [201, 400]);

  // Final count in DB must be exactly 2
  const count = await GroupMemberModel.countMembers(groupId);
  assert.equal(count, 2);
});

test("ADD-10: Lead requesting role: 'lead' is rejected with 403; Owner CAN assign lead", async () => {
  const { group, ownerToken, leadToken } = await setupGroupA();

  // Lead tries to promote TARGET_USER to Lead -> 403
  const failRes = await request(`/api/groups/${group.id}/members`, {
    method: "POST",
    token: leadToken,
    body: { userId: TARGET_USER.id, role: "lead" },
  });
  assert.equal(failRes.response.status, 403);

  // Owner can promote TARGET_USER to Lead -> 201
  const successRes = await request(`/api/groups/${group.id}/members`, {
    method: "POST",
    token: ownerToken,
    body: { userId: TARGET_USER.id, role: "lead" },
  });
  assert.equal(successRes.response.status, 201);
  assert.equal(successRes.data.data.role, "lead");
});

test("ADD-11: Invalid role/groupRole fails validation with 400", async () => {
  const { group, ownerToken } = await setupGroupA();
  const cases = [
    { userId: TARGET_USER.id, role: "admin" },
    { userId: TARGET_USER.id, groupRole: "superadmin" },
  ];

  for (const body of cases) {
    const { response, data } = await request(`/api/groups/${group.id}/members`, {
      method: "POST",
      token: ownerToken,
      body,
    });
    assert.equal(response.status, 400);
    assert.equal(data.error, "VALIDATION_ERROR");
  }
});

// ==========================================
// DELETE /api/groups/:id/members/:userId — remove/leave
// ==========================================
test("REMOVE-01 & REMOVE-02: Owner and Lead remove regular member", async () => {
  const { group, ownerToken, leadToken } = await setupGroupA();

  // Lead removes Member
  const resLead = await request(`/api/groups/${group.id}/members/${MEMBER_USER.id}`, {
    method: "DELETE",
    token: leadToken,
  });
  assert.equal(resLead.response.status, 200);

  // Re-add Member, then Owner removes Member
  await request(`/api/groups/${group.id}/members`, {
    method: "POST",
    token: ownerToken,
    body: { userId: MEMBER_USER.id, role: "member" },
  });

  const resOwner = await request(`/api/groups/${group.id}/members/${MEMBER_USER.id}`, {
    method: "DELETE",
    token: ownerToken,
  });
  assert.equal(resOwner.response.status, 200);
});

test("REMOVE-03: Regular member cannot remove another member (403)", async () => {
  const { group, memberToken } = await setupGroupA();
  const { response } = await request(`/api/groups/${group.id}/members/${LEAD_USER.id}`, {
    method: "DELETE",
    token: memberToken,
  });
  assert.equal(response.status, 403);
});

test("REMOVE-04: Lead cannot remove Owner (403 CANNOT_REMOVE_OWNER)", async () => {
  const { group, leadToken } = await setupGroupA();
  const { response, data } = await request(`/api/groups/${group.id}/members/${OWNER_USER.id}`, {
    method: "DELETE",
    token: leadToken,
  });
  assert.equal(response.status, 403);
  assert.equal(data.error, "CANNOT_REMOVE_OWNER");
});

test("REMOVE-05 & REMOVE-06: Lead cannot remove Lead (403); Owner CAN remove Lead (200)", async () => {
  const { group, ownerToken, leadToken } = await setupGroupA();

  // Add second lead (TARGET_USER)
  await request(`/api/groups/${group.id}/members`, {
    method: "POST",
    token: ownerToken,
    body: { userId: TARGET_USER.id, role: "lead" },
  });

  // Lead A tries to remove Lead B -> 403
  const failRes = await request(`/api/groups/${group.id}/members/${TARGET_USER.id}`, {
    method: "DELETE",
    token: leadToken,
  });
  assert.equal(failRes.response.status, 403);

  // Owner removes Lead B -> 200
  const successRes = await request(`/api/groups/${group.id}/members/${TARGET_USER.id}`, {
    method: "DELETE",
    token: ownerToken,
  });
  assert.equal(successRes.response.status, 200);
});

test("REMOVE-07: Member or Lead removes themselves (leave group) succeeds", async () => {
  const { group, memberToken, leadToken } = await setupGroupA();

  const resMemberLeave = await request(`/api/groups/${group.id}/members/${MEMBER_USER.id}`, {
    method: "DELETE",
    token: memberToken,
  });
  assert.equal(resMemberLeave.response.status, 200);

  const resLeadLeave = await request(`/api/groups/${group.id}/members/${LEAD_USER.id}`, {
    method: "DELETE",
    token: leadToken,
  });
  assert.equal(resLeadLeave.response.status, 200);
});

test("REMOVE-08: Owner cannot leave without transferring ownership (400 OWNER_CANNOT_LEAVE)", async () => {
  const { group, ownerToken } = await setupGroupA();
  const { response, data } = await request(`/api/groups/${group.id}/members/${OWNER_USER.id}`, {
    method: "DELETE",
    token: ownerToken,
  });
  assert.equal(response.status, 400);
  assert.equal(data.error, "OWNER_CANNOT_LEAVE");
});

test("REMOVE-09: Outsider cannot remove member (403)", async () => {
  const { group, outsiderToken } = await setupGroupA();
  const { response } = await request(`/api/groups/${group.id}/members/${MEMBER_USER.id}`, {
    method: "DELETE",
    token: outsiderToken,
  });
  assert.equal(response.status, 403);
});

test("REMOVE-10: Target is not a member returns 404 MEMBER_NOT_FOUND", async () => {
  const { group, ownerToken } = await setupGroupA();
  const { response, data } = await request(`/api/groups/${group.id}/members/${TARGET_USER.id}`, {
    method: "DELETE",
    token: ownerToken,
  });
  assert.equal(response.status, 404);
  assert.equal(data.error, "MEMBER_NOT_FOUND");
});

test("REMOVE-11: Group does not exist returns 404 GROUP_NOT_FOUND", async () => {
  const token = createToken(OWNER_USER);
  const { response, data } = await request(
    `/api/groups/00000000-0000-0000-0000-000000000000/members/${MEMBER_USER.id}`,
    { method: "DELETE", token }
  );
  assert.equal(response.status, 404);
  assert.equal(data.error, "GROUP_NOT_FOUND");
});

test("REMOVE-12: Cross-group removal attempt returns 404 and does not affect target", async () => {
  const { group: groupA, ownerToken: ownerA } = await setupGroupA();

  // Create Group B with TARGET_USER
  const leadToken = createToken(LEAD_USER);
  const createB = await request("/api/groups", {
    method: "POST",
    token: leadToken,
    body: { name: "Group B" },
  });
  const groupB = createB.data.data;

  await request(`/api/groups/${groupB.id}/members`, {
    method: "POST",
    token: leadToken,
    body: { userId: TARGET_USER.id, role: "member" },
  });

  // Owner A tries to remove TARGET_USER using Group A's route
  const { response, data } = await request(`/api/groups/${groupA.id}/members/${TARGET_USER.id}`, {
    method: "DELETE",
    token: ownerA,
  });
  assert.equal(response.status, 404);
  assert.equal(data.error, "MEMBER_NOT_FOUND");

  // Verify TARGET_USER is still in Group B
  const checkMember = await GroupMemberModel.findMember(groupB.id, TARGET_USER.id);
  assert.ok(checkMember);
});
