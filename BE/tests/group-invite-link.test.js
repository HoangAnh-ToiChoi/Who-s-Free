import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, beforeEach, test } from "node:test";
import { once } from "node:events";

const OWNER_USER = {
  id: "11111111-0000-0000-0000-000000000001",
  email: "owner@example.com",
  full_name: "Group Owner",
  role: "authenticated",
};
const LEAD_USER = {
  id: "22222222-0000-0000-0000-000000000002",
  email: "lead@example.com",
  full_name: "Group Lead",
  role: "authenticated",
};
const MEMBER_USER = {
  id: "33333333-0000-0000-0000-000000000003",
  email: "member@example.com",
  full_name: "Group Member",
  role: "authenticated",
};
const NEW_JOINER = {
  id: "44444444-0000-0000-0000-000000000004",
  email: "joiner@example.com",
  full_name: "New Joiner",
  role: "authenticated",
};

let app;
let GroupModel;
let GroupMemberModel;
let GroupInviteLinkModel;
let UserModel;
let TokenService;
let usersById;
let server;
let baseUrl;

function getAuthToken(user) {
  return TokenService.generateAccessToken(user);
}

async function request(path, { method = "GET", body, token } = {}) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  return { response, data };
}

let testGroup;
let membersStore = [];

before(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "whosfree_super_secret_jwt_key_2026_dongianlaanhratdeptrai";
  process.env.CLIENT_ORIGIN = "http://localhost:5173";

  ({ default: app } = await import("../src/app.js"));
  ({ default: GroupModel } = await import("../src/models/group.model.js"));
  ({ default: GroupMemberModel } = await import("../src/models/group-member.model.js"));
  ({ default: GroupInviteLinkModel } = await import("../src/models/group-invite-link.model.js"));
  ({ default: UserModel } = await import("../src/models/user.model.js"));
  ({ default: TokenService } = await import("../src/services/token.service.js"));

  usersById = new Map([
    [OWNER_USER.id, OWNER_USER],
    [LEAD_USER.id, LEAD_USER],
    [MEMBER_USER.id, MEMBER_USER],
    [NEW_JOINER.id, NEW_JOINER],
  ]);

  UserModel.findById = async (id) => usersById.get(id) || null;
  UserModel.findByEmail = async (email) => {
    const normalized = (email || "").toLowerCase();
    for (const u of usersById.values()) {
      if (u.email.toLowerCase() === normalized) return u;
    }
    return null;
  };

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
  GroupInviteLinkModel.clear();
  testGroup = {
    id: "99999999-0000-0000-0000-000000000001",
    name: "Engineering Core",
    slug: "engineering-core",
    capacity: 3,
    created_by: OWNER_USER.id,
  };

  membersStore = [
    {
      id: "m-1",
      group_id: testGroup.id,
      user_id: OWNER_USER.id,
      role: "owner",
      group_role: "leadership",
      joined_at: new Date(),
    },
    {
      id: "m-2",
      group_id: testGroup.id,
      user_id: LEAD_USER.id,
      role: "lead",
      group_role: "leadership",
      joined_at: new Date(),
    },
  ];

  GroupModel.findById = async (id) => (id === testGroup.id ? testGroup : null);
  GroupModel.findByIdOrSlug = async (key) =>
    key === testGroup.id || key === testGroup.slug ? testGroup : null;

  GroupMemberModel.findMember = async (groupId, userId) => {
    return (
      membersStore.find(
        (m) => m.group_id === groupId && m.user_id === userId
      ) || null
    );
  };

  GroupMemberModel.countMembers = async (groupId) => {
    return membersStore.filter((m) => m.group_id === groupId).length;
  };

  GroupMemberModel.addMemberWithCapacityCheck = async ({
    groupId,
    userId,
    role = "member",
    groupRole = "core",
  }) => {
    const currentCount = membersStore.filter((m) => m.group_id === groupId).length;
    if (currentCount >= testGroup.capacity) {
      const { default: AppError } = await import("../src/utils/AppError.js");
      throw AppError.badRequest("Nhóm đã đạt số lượng tối đa", "GROUP_CAPACITY_FULL");
    }
    const exists = membersStore.some(
      (m) => m.group_id === groupId && m.user_id === userId
    );
    if (exists) {
      const { default: AppError } = await import("../src/utils/AppError.js");
      throw AppError.conflict("Người dùng này đã là thành viên trong nhóm", "ALREADY_MEMBER");
    }
    const newMember = {
      id: `m-${membersStore.length + 1}`,
      group_id: groupId,
      user_id: userId,
      role,
      group_role: groupRole,
      joined_at: new Date(),
    };
    membersStore.push(newMember);
    return newMember;
  };
});

test("INVITE-LINK-01: Yêu cầu đăng nhập khi tạo link mời (401)", async () => {
  const { response, data } = await request(
    `/api/groups/${testGroup.id}/invite-link`,
    { method: "POST" }
  );
  assert.strictEqual(response.status, 401);
  assert.strictEqual(data.success, false);
});

test("INVITE-LINK-02: Thành viên thông thường không được tạo link mời (403 FORBIDDEN)", async () => {
  membersStore.push({
    id: "m-3",
    group_id: testGroup.id,
    user_id: MEMBER_USER.id,
    role: "member",
    group_role: "core",
  });

  const { response, data } = await request(
    `/api/groups/${testGroup.id}/invite-link`,
    { method: "POST", token: getAuthToken(MEMBER_USER) }
  );
  assert.strictEqual(response.status, 403);
  assert.strictEqual(data.error, "FORBIDDEN");
});

test("INVITE-LINK-03: Lead hoặc Owner tạo link mời thành công (201)", async () => {
  const { response, data } = await request(
    `/api/groups/${testGroup.id}/invite-link`,
    { method: "POST", token: getAuthToken(LEAD_USER) }
  );

  assert.strictEqual(response.status, 201);
  assert.strictEqual(data.success, true);
  assert.ok(data.data.token);
  assert.strictEqual(data.data.token.length, 64); // 32 bytes hex
  assert.ok(data.data.inviteUrl.includes(`/join/${data.data.token}`));
  assert.ok(data.data.expiresAt);
});

test("INVITE-LINK-04: Tạo link mới sẽ vô hiệu hóa (revoke) link cũ ngay lập tức", async () => {
  const firstRes = await request(`/api/groups/${testGroup.id}/invite-link`, {
    method: "POST",
    token: getAuthToken(OWNER_USER),
  });
  const firstToken = firstRes.data.data.token;

  const secondRes = await request(`/api/groups/${testGroup.id}/invite-link`, {
    method: "POST",
    token: getAuthToken(OWNER_USER),
  });
  const secondToken = secondRes.data.data.token;

  assert.notStrictEqual(firstToken, secondToken);

  // Link cũ xem trước sẽ thấy isRevoked = true
  const previewOld = await request(`/api/join/${firstToken}`);
  assert.strictEqual(previewOld.data.data.isRevoked, true);

  // Link mới xem trước isRevoked = false
  const previewNew = await request(`/api/join/${secondToken}`);
  assert.strictEqual(previewNew.data.data.isRevoked, false);
});

test("INVITE-LINK-05: Lấy link active hiện tại (GET /api/groups/:id/invite-link)", async () => {
  // Chưa tạo link
  const emptyRes = await request(`/api/groups/${testGroup.id}/invite-link`, {
    token: getAuthToken(OWNER_USER),
  });
  assert.strictEqual(emptyRes.response.status, 200);
  assert.strictEqual(emptyRes.data.data.token, null);

  // Tạo link
  const createRes = await request(`/api/groups/${testGroup.id}/invite-link`, {
    method: "POST",
    token: getAuthToken(OWNER_USER),
  });
  const createdToken = createRes.data.data.token;

  // Lấy lại link
  const getRes = await request(`/api/groups/${testGroup.id}/invite-link`, {
    token: getAuthToken(OWNER_USER),
  });
  assert.strictEqual(getRes.response.status, 200);
  assert.strictEqual(getRes.data.data.token, createdToken);
});

test("JOIN-PREVIEW-01: Public preview xem trước nhóm thành công mà không cần token xác thực", async () => {
  const createRes = await request(`/api/groups/${testGroup.id}/invite-link`, {
    method: "POST",
    token: getAuthToken(OWNER_USER),
  });
  const token = createRes.data.data.token;

  const { response, data } = await request(`/api/join/${token}`);
  assert.strictEqual(response.status, 200);
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.data.group.name, testGroup.name);
  assert.strictEqual(data.data.isExpired, false);
  assert.strictEqual(data.data.isRevoked, false);
  assert.strictEqual(data.data.isGroupFull, false);
});

test("JOIN-PREVIEW-02: Token không tồn tại trả về 404 INVITATION_NOT_FOUND", async () => {
  const { response, data } = await request(`/api/join/invalid-fake-token-1234`);
  assert.strictEqual(response.status, 404);
  assert.strictEqual(data.error, "INVITATION_NOT_FOUND");
});

test("JOIN-01: Yêu cầu đăng nhập khi thực hiện join nhóm (401)", async () => {
  const createRes = await request(`/api/groups/${testGroup.id}/invite-link`, {
    method: "POST",
    token: getAuthToken(OWNER_USER),
  });
  const token = createRes.data.data.token;

  const { response } = await request(`/api/join/${token}`, { method: "POST" });
  assert.strictEqual(response.status, 401);
});

test("JOIN-02: Người dùng đăng nhập join nhóm thành công với vai trò member", async () => {
  const createRes = await request(`/api/groups/${testGroup.id}/invite-link`, {
    method: "POST",
    token: getAuthToken(OWNER_USER),
  });
  const token = createRes.data.data.token;

  const { response, data } = await request(`/api/join/${token}`, {
    method: "POST",
    token: getAuthToken(NEW_JOINER),
  });

  assert.strictEqual(response.status, 200);
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.data.member.userId, NEW_JOINER.id);
  assert.strictEqual(data.data.member.role, "member");
  assert.strictEqual(data.data.member.groupRole, "core");
});

test("JOIN-03: Đã là thành viên không thể join lại (409 ALREADY_MEMBER)", async () => {
  const createRes = await request(`/api/groups/${testGroup.id}/invite-link`, {
    method: "POST",
    token: getAuthToken(OWNER_USER),
  });
  const token = createRes.data.data.token;

  const { response, data } = await request(`/api/join/${token}`, {
    method: "POST",
    token: getAuthToken(LEAD_USER), // Lead đã là thành viên
  });

  assert.strictEqual(response.status, 409);
  assert.strictEqual(data.error, "ALREADY_MEMBER");
});

test("JOIN-04: Từ chối join khi link đã bị revoked (400 INVITATION_REVOKED)", async () => {
  const firstRes = await request(`/api/groups/${testGroup.id}/invite-link`, {
    method: "POST",
    token: getAuthToken(OWNER_USER),
  });
  const oldToken = firstRes.data.data.token;

  // Reset link -> oldToken bị revoke
  await request(`/api/groups/${testGroup.id}/invite-link`, {
    method: "POST",
    token: getAuthToken(OWNER_USER),
  });

  const { response, data } = await request(`/api/join/${oldToken}`, {
    method: "POST",
    token: getAuthToken(NEW_JOINER),
  });

  assert.strictEqual(response.status, 400);
  assert.strictEqual(data.error, "INVITATION_REVOKED");
});

test("JOIN-05: Từ chối join khi nhóm đã đầy (400 GROUP_CAPACITY_FULL)", async () => {
  // testGroup capacity = 3. Đã có OWNER (1) và LEAD (2). Thêm 1 member nữa là đầy (3).
  membersStore.push({
    id: "m-3",
    group_id: testGroup.id,
    user_id: MEMBER_USER.id,
    role: "member",
    group_role: "core",
  });

  const createRes = await request(`/api/groups/${testGroup.id}/invite-link`, {
    method: "POST",
    token: getAuthToken(OWNER_USER),
  });
  const token = createRes.data.data.token;

  const { response, data } = await request(`/api/join/${token}`, {
    method: "POST",
    token: getAuthToken(NEW_JOINER),
  });

  assert.strictEqual(response.status, 400);
  assert.strictEqual(data.error, "GROUP_CAPACITY_FULL");
});
