import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, beforeEach, test } from "node:test";
import { once } from "node:events";

const OWNER_USER = {
  id: "10000000-0000-0000-0000-000000000001",
  email: "owner@example.com",
  full_name: "Group Owner",
  role: "authenticated",
};
const LEAD_USER = {
  id: "20000000-0000-0000-0000-000000000002",
  email: "lead@example.com",
  full_name: "Group Lead",
  role: "authenticated",
};
const MEMBER_USER = {
  id: "30000000-0000-0000-0000-000000000003",
  email: "member@example.com",
  full_name: "Group Member",
  role: "authenticated",
};
const TARGET_USER = {
  id: "40000000-0000-0000-0000-000000000004",
  email: "invitee@example.com",
  full_name: "Invited Person",
  role: "authenticated",
};
const OTHER_USER = {
  id: "50000000-0000-0000-0000-000000000005",
  email: "wronguser@example.com",
  full_name: "Wrong Person",
  role: "authenticated",
};
const NEW_USER = {
  id: "60000000-0000-0000-0000-000000000006",
  email: "newuser@example.com",
  full_name: "New User",
  role: "authenticated",
};

let app;
let GroupModel;
let GroupMemberModel;
let GroupInvitationModel;
let UserModel;
let TokenService;
let EmailService;
let sendGroupInvitationImplementation;
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

before(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "whosfree_super_secret_jwt_key_2026_dongianlaanhratdeptrai";
  process.env.CLIENT_ORIGIN = "http://localhost:5173";

  ({ default: app } = await import("../src/app.js"));
  ({ default: GroupModel } = await import("../src/models/group.model.js"));
  ({ default: GroupMemberModel } = await import("../src/models/group-member.model.js"));
  ({ default: GroupInvitationModel } = await import("../src/models/group-invitation.model.js"));
  ({ default: UserModel } = await import("../src/models/user.model.js"));
  ({ default: TokenService } = await import("../src/services/token.service.js"));
  ({ default: EmailService } = await import("../src/services/email.service.js"));
  sendGroupInvitationImplementation = EmailService.sendGroupInvitation;

  // Mock in-memory models cho test môi trường cô lập, hoàn toàn không gọi Supabase thật
  usersById = new Map([
    [OWNER_USER.id, OWNER_USER],
    [LEAD_USER.id, LEAD_USER],
    [MEMBER_USER.id, MEMBER_USER],
    [TARGET_USER.id, TARGET_USER],
    [OTHER_USER.id, OTHER_USER],
    [NEW_USER.id, NEW_USER],
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

// Helper setup nhóm test
let testGroup;
let membersStore = [];

beforeEach(() => {
  GroupInvitationModel.clear();
  testGroup = {
    id: "90000000-0000-0000-0000-000000000001",
    name: "Engineering Team",
    slug: "engineering-team",
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
      email: OWNER_USER.email,
      full_name: OWNER_USER.full_name,
    },
    {
      id: "m-2",
      group_id: testGroup.id,
      user_id: LEAD_USER.id,
      role: "lead",
      group_role: "leadership",
      email: LEAD_USER.email,
      full_name: LEAD_USER.full_name,
    },
  ];

  GroupModel.findById = async (id) => (id === testGroup.id ? testGroup : null);
  GroupModel.findByIdOrSlug = async (id) =>
    id === testGroup.id || id === testGroup.slug ? testGroup : null;

  GroupMemberModel.findMember = async (groupId, userId) => {
    return membersStore.find((m) => m.group_id === groupId && m.user_id === userId) || null;
  };
  GroupMemberModel.countMembers = async (groupId) => {
    return membersStore.filter((m) => m.group_id === groupId).length;
  };
  GroupMemberModel.addMemberWithCapacityCheck = async ({ groupId, userId, role, groupRole }) => {
    const count = membersStore.filter((m) => m.group_id === groupId).length;
    if (count >= testGroup.capacity) {
      const err = new Error(`Nhóm đã đạt số lượng tối đa (${testGroup.capacity} thành viên)`);
      err.statusCode = 400;
      err.errorCode = "GROUP_CAPACITY_FULL";
      throw err;
    }
    const user = [OWNER_USER, LEAD_USER, MEMBER_USER, TARGET_USER, OTHER_USER, NEW_USER].find((u) => u.id === userId);
    const newM = {
      id: `m-${Date.now()}`,
      group_id: groupId,
      user_id: userId,
      role,
      group_role: groupRole,
      email: user?.email,
      full_name: user?.full_name,
    };
    membersStore.push(newM);
    return newM;
  };
});

// ==========================================
// 1. LUỒNG TẠO LỜI MỜI & GỬI EMAIL
// ==========================================

test("INVITE-01: Owner tạo lời mời thành công và gửi email qua Resend", async () => {
  let emailSentPayload = null;
  EmailService.sendGroupInvitation = async (payload) => {
    emailSentPayload = payload;
    return { id: "resend-msg-123" };
  };

  const { response, data } = await request(`/api/groups/${testGroup.id}/invitations`, {
    method: "POST",
    token: getAuthToken(OWNER_USER),
    body: { email: "invitee@example.com", role: "member" },
  });

  assert.equal(response.status, 201);
  assert.equal(data.success, true);
  assert.ok(data.data.inviteLink);
  assert.match(data.data.inviteLink, /\/invite\/[a-f0-9]{64}$/);
  assert.equal(data.data.invitation.email, "invitee@example.com");
  assert.equal(data.data.invitation.role, "member");
  const token = data.data.inviteLink.split("/invite/")[1];
  const storedInvitation = Array.from(GroupInvitationModel.store.values())[0];
  assert.equal(
    storedInvitation.token_hash,
    crypto.createHash("sha256").update(token).digest("hex")
  );
  assert.ok(
    Math.abs(
      new Date(storedInvitation.expires_at) - new Date(storedInvitation.created_at) - 24 * 60 * 60 * 1000
    ) < 1000
  );

  // Kiểm tra email được gửi
  assert.ok(emailSentPayload);
  assert.equal(emailSentPayload.email, "invitee@example.com");
  assert.equal(emailSentPayload.groupName, "Engineering Team");
  assert.equal(emailSentPayload.expiresInHours, 24);
});

test("INVITE-02: Lỗi Resend được báo đúng và không lưu lời mời giả (rollback)", async () => {
  EmailService.sendGroupInvitation = async () => {
    const err = new Error("Không thể gửi email lúc này. Vui lòng thử lại sau.");
    err.statusCode = 502;
    err.errorCode = "EMAIL_SEND_FAILED";
    throw err;
  };

  const { response, data } = await request(`/api/groups/${testGroup.id}/invitations`, {
    method: "POST",
    token: getAuthToken(OWNER_USER),
    body: { email: "fail-email@example.com", role: "member" },
  });

  assert.equal(response.status, 502);
  assert.equal(data.success, false);
  assert.equal(data.error, "EMAIL_SEND_FAILED");

  // Đảm bảo không lưu lời mời giả trong store
  assert.equal(GroupInvitationModel.store.size, 0);
});

test("INVITE-02B: Gửi lại lỗi thì lời mời cũ vẫn còn hiệu lực", async () => {
  EmailService.sendGroupInvitation = async () => ({ id: "ok" });
  const first = await request(`/api/groups/${testGroup.id}/invitations`, {
    method: "POST",
    token: getAuthToken(OWNER_USER),
    body: { email: TARGET_USER.email },
  });
  const firstId = first.data.data.invitation.id;
  const oldToken = first.data.data.inviteLink.split("/invite/")[1];

  EmailService.sendGroupInvitation = async () => {
    const error = new Error("Resend unavailable");
    error.statusCode = 502;
    error.errorCode = "EMAIL_SEND_FAILED";
    throw error;
  };
  const resend = await request(
    `/api/groups/${testGroup.id}/invitations/${firstId}/resend`,
    { method: "POST", token: getAuthToken(OWNER_USER) }
  );

  assert.equal(resend.response.status, 502);
  const oldInvitation = await GroupInvitationModel.findById(firstId);
  assert.equal(oldInvitation.status, "pending");
  const preview = await request(`/api/invitations/${oldToken}`);
  assert.equal(preview.data.data.isRevoked, false);
});

test("INVITE-03: Lead không được phép mời vai trò Lead (Chỉ Owner mới có quyền)", async () => {
  const { response, data } = await request(`/api/groups/${testGroup.id}/invitations`, {
    method: "POST",
    token: getAuthToken(LEAD_USER),
    body: { email: "newlead@example.com", role: "lead" },
  });

  assert.equal(response.status, 403);
  assert.equal(data.error, "FORBIDDEN");
});

test("INVITE-04: Thành viên thông thường (Member) không có quyền tạo lời mời", async () => {
  // Thêm MEMBER_USER vào nhóm
  membersStore.push({
    id: "m-3",
    group_id: testGroup.id,
    user_id: MEMBER_USER.id,
    role: "member",
    group_role: "core",
  });

  const { response, data } = await request(`/api/groups/${testGroup.id}/invitations`, {
    method: "POST",
    token: getAuthToken(MEMBER_USER),
    body: { email: "outsider@example.com" },
  });

  assert.equal(response.status, 403);
  assert.equal(data.error, "FORBIDDEN");
});

test("INVITE-05: Từ chối tạo lời mời nếu người nhận đã là thành viên trong nhóm", async () => {
  const { response, data } = await request(`/api/groups/${testGroup.id}/invitations`, {
    method: "POST",
    token: getAuthToken(OWNER_USER),
    body: { email: LEAD_USER.email },
  });

  assert.equal(response.status, 409);
  assert.equal(data.error, "ALREADY_MEMBER");
});

test("INVITE-06: Từ chối tạo lời mời khi nhóm đã đạt sức chứa tối đa", async () => {
  // Nhóm có capacity = 3, thêm 1 member để đủ 3 người
  membersStore.push({
    id: "m-3",
    group_id: testGroup.id,
    user_id: MEMBER_USER.id,
    role: "member",
    group_role: "core",
  });

  const { response, data } = await request(`/api/groups/${testGroup.id}/invitations`, {
    method: "POST",
    token: getAuthToken(OWNER_USER),
    body: { email: "someone@example.com" },
  });

  assert.equal(response.status, 400);
  assert.equal(data.error, "GROUP_CAPACITY_FULL");
});

// ==========================================
// 2. XEM TRƯỚC LỜI MỜI (GET /api/invitations/:token)
// ==========================================

test("PREVIEW-01: Xem trước lời mời hợp lệ mà KHÔNG làm thay đổi dữ liệu", async () => {
  EmailService.sendGroupInvitation = async () => ({ id: "ok" });

  const createRes = await request(`/api/groups/${testGroup.id}/invitations`, {
    method: "POST",
    token: getAuthToken(OWNER_USER),
    body: { email: TARGET_USER.email },
  });
  const token = createRes.data.data.inviteLink.split("/invite/")[1];

  // Gọi GET xem trước (không cần token đăng nhập)
  const { response, data } = await request(`/api/invitations/${token}`);

  assert.equal(response.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.email, TARGET_USER.email);
  assert.equal(data.data.isExpired, false);
  assert.equal(data.data.isAccepted, false);
  assert.equal(data.data.isRevoked, false);
  assert.equal(data.data.isGroupFull, false);
  assert.equal(data.data.group.name, "Engineering Team");

  // Kiểm tra dữ liệu lời mời vẫn ở trạng thái pending
  const inv = Array.from(GroupInvitationModel.store.values())[0];
  assert.equal(inv.status, "pending");
});

test("PREVIEW-02: Xem trước với token không tồn tại trả về 404", async () => {
  const { response, data } = await request("/api/invitations/invalid-nonexistent-token");
  assert.equal(response.status, 404);
  assert.equal(data.error, "INVITATION_NOT_FOUND");
});

// ==========================================
// 3. CHẤP NHẬN LỜI MỜI (POST /api/invitations/:token/accept)
// ==========================================

test("ACCEPT-01: Chấp nhận lời mời thành công khi đăng nhập đúng email", async () => {
  EmailService.sendGroupInvitation = async () => ({ id: "ok" });

  const createRes = await request(`/api/groups/${testGroup.id}/invitations`, {
    method: "POST",
    token: getAuthToken(OWNER_USER),
    body: { email: TARGET_USER.email, role: "member" },
  });
  const token = createRes.data.data.inviteLink.split("/invite/")[1];

  // Chấp nhận lời mời bằng đúng tài khoản TARGET_USER
  const { response, data } = await request(`/api/invitations/${token}/accept`, {
    method: "POST",
    token: getAuthToken(TARGET_USER),
  });

  assert.equal(response.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.member.userId, TARGET_USER.id);
  assert.equal(data.data.member.role, "member");

  // Kiểm tra thành viên đã được thêm vào nhóm thực tế
  const isMember = membersStore.some((m) => m.user_id === TARGET_USER.id);
  assert.equal(isMember, true);

  // Kiểm tra lời mời đã chuyển sang accepted
  const inv = Array.from(GroupInvitationModel.store.values())[0];
  assert.equal(inv.status, "accepted");
  assert.ok(inv.accepted_at);
});

test("ACCEPT-01B: Người chưa có tài khoản có thể đăng ký đúng email rồi chấp nhận lời mời", async () => {
  EmailService.sendGroupInvitation = async () => ({ id: "ok" });
  usersById.delete(NEW_USER.id);
  assert.equal(await UserModel.findByEmail(NEW_USER.email), null);

  const createRes = await request(`/api/groups/${testGroup.id}/invitations`, {
    method: "POST",
    token: getAuthToken(OWNER_USER),
    body: { email: NEW_USER.email },
  });
  assert.equal(createRes.response.status, 201);
  const token = createRes.data.data.inviteLink.split("/invite/")[1];

  // Tài khoản được tạo sau đó bằng email đã nhận lời mời.
  usersById.set(NEW_USER.id, NEW_USER);
  const acceptRes = await request(`/api/invitations/${token}/accept`, {
    method: "POST",
    token: getAuthToken(NEW_USER),
  });
  assert.equal(acceptRes.response.status, 200);
  assert.equal(acceptRes.data.data.member.userId, NEW_USER.id);
});

test("ACCEPT-01C: Không đăng nhập thì không thể chấp nhận lời mời", async () => {
  EmailService.sendGroupInvitation = async () => ({ id: "ok" });
  const createRes = await request(`/api/groups/${testGroup.id}/invitations`, {
    method: "POST",
    token: getAuthToken(OWNER_USER),
    body: { email: TARGET_USER.email },
  });
  const token = createRes.data.data.inviteLink.split("/invite/")[1];

  const response = await request(`/api/invitations/${token}/accept`, { method: "POST" });
  assert.equal(response.response.status, 401);
});

test("ACCEPT-02: Tài khoản có email khác không thể chấp nhận lời mời (EMAIL_MISMATCH 403)", async () => {
  EmailService.sendGroupInvitation = async () => ({ id: "ok" });

  const createRes = await request(`/api/groups/${testGroup.id}/invitations`, {
    method: "POST",
    token: getAuthToken(OWNER_USER),
    body: { email: TARGET_USER.email },
  });
  const token = createRes.data.data.inviteLink.split("/invite/")[1];

  // Cố chấp nhận bằng tài khoản OTHER_USER (email wronguser@example.com)
  const { response, data } = await request(`/api/invitations/${token}/accept`, {
    method: "POST",
    token: getAuthToken(OTHER_USER),
  });

  assert.equal(response.status, 403);
  assert.equal(data.error, "EMAIL_MISMATCH");
});

test("ACCEPT-03: Token đã dùng (accepted) không thể dùng lại", async () => {
  EmailService.sendGroupInvitation = async () => ({ id: "ok" });

  const createRes = await request(`/api/groups/${testGroup.id}/invitations`, {
    method: "POST",
    token: getAuthToken(OWNER_USER),
    body: { email: TARGET_USER.email },
  });
  const token = createRes.data.data.inviteLink.split("/invite/")[1];

  // Chấp nhận lần 1
  await request(`/api/invitations/${token}/accept`, {
    method: "POST",
    token: getAuthToken(TARGET_USER),
  });

  // Chấp nhận lần 2
  const { response, data } = await request(`/api/invitations/${token}/accept`, {
    method: "POST",
    token: getAuthToken(TARGET_USER),
  });

  assert.equal(response.status, 400);
  assert.equal(data.error, "INVITATION_ALREADY_ACCEPTED");
});

test("ACCEPT-04: Token hết hạn sau 24 giờ không thể chấp nhận", async () => {
  EmailService.sendGroupInvitation = async () => ({ id: "ok" });

  const createRes = await request(`/api/groups/${testGroup.id}/invitations`, {
    method: "POST",
    token: getAuthToken(OWNER_USER),
    body: { email: TARGET_USER.email },
  });
  const token = createRes.data.data.inviteLink.split("/invite/")[1];

  // Chỉnh sửa thời gian hết hạn về quá khứ
  const inv = Array.from(GroupInvitationModel.store.values())[0];
  inv.expires_at = new Date(Date.now() - 1000 * 60);

  const { response, data } = await request(`/api/invitations/${token}/accept`, {
    method: "POST",
    token: getAuthToken(TARGET_USER),
  });

  assert.equal(response.status, 400);
  assert.equal(data.error, "INVITATION_EXPIRED");
});

// ==========================================
// 4. GỬI LẠI VÀ THU HỒI LỜI MỜI
// ==========================================

test("RESEND-01: Gửi lại lời mời vô hiệu hóa link cũ và cấp hạn 24 giờ mới", async () => {
  EmailService.sendGroupInvitation = async () => ({ id: "ok" });

  // Lời mời 1
  const firstRes = await request(`/api/groups/${testGroup.id}/invitations`, {
    method: "POST",
    token: getAuthToken(OWNER_USER),
    body: { email: TARGET_USER.email },
  });
  const firstToken = firstRes.data.data.inviteLink.split("/invite/")[1];
  const firstInviteId = firstRes.data.data.invitation.id;

  // Gửi lại lời mời
  const resendRes = await request(
    `/api/groups/${testGroup.id}/invitations/${firstInviteId}/resend`,
    {
      method: "POST",
      token: getAuthToken(OWNER_USER),
    }
  );

  assert.equal(resendRes.response.status, 201);
  const secondToken = resendRes.data.data.inviteLink.split("/invite/")[1];
  assert.notEqual(firstToken, secondToken);

  // Thử dùng lại firstToken -> bị từ chối vì đã bị thu hồi
  const { response, data } = await request(`/api/invitations/${firstToken}/accept`, {
    method: "POST",
    token: getAuthToken(TARGET_USER),
  });
  assert.equal(response.status, 400);
  assert.equal(data.error, "INVITATION_REVOKED");

  // Dùng secondToken -> thành công
  const secondAccept = await request(`/api/invitations/${secondToken}/accept`, {
    method: "POST",
    token: getAuthToken(TARGET_USER),
  });
  assert.equal(secondAccept.response.status, 200);
  assert.equal(secondAccept.data.success, true);
});

test("REVOKE-01: Thu hồi lời mời thành công và link bị vô hiệu hóa", async () => {
  EmailService.sendGroupInvitation = async () => ({ id: "ok" });

  const createRes = await request(`/api/groups/${testGroup.id}/invitations`, {
    method: "POST",
    token: getAuthToken(OWNER_USER),
    body: { email: TARGET_USER.email },
  });
  const token = createRes.data.data.inviteLink.split("/invite/")[1];
  const inviteId = createRes.data.data.invitation.id;

  // Thu hồi
  const revokeRes = await request(
    `/api/groups/${testGroup.id}/invitations/${inviteId}`,
    {
      method: "DELETE",
      token: getAuthToken(OWNER_USER),
    }
  );
  assert.equal(revokeRes.response.status, 200);

  // Thử accept link đã thu hồi -> 400 INVITATION_REVOKED
  const acceptRes = await request(`/api/invitations/${token}/accept`, {
    method: "POST",
    token: getAuthToken(TARGET_USER),
  });
  assert.equal(acceptRes.response.status, 400);
  assert.equal(acceptRes.data.error, "INVITATION_REVOKED");
});

test("EMAIL-01: Không cấu hình Resend thì không báo gửi email thành công giả", async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.RESEND_FROM_EMAIL;
  const originalSender = EmailService.sendGroupInvitation;
  process.env.NODE_ENV = "development";
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  EmailService.sendGroupInvitation = sendGroupInvitationImplementation;

  try {
    await assert.rejects(
      EmailService.sendGroupInvitation({
        email: TARGET_USER.email,
        groupName: "Engineering Team",
        inviterName: OWNER_USER.full_name,
        inviteUrl: "http://localhost:5173/invite/test-token",
      }),
      (error) => error.errorCode === "EMAIL_NOT_CONFIGURED"
    );
  } finally {
    EmailService.sendGroupInvitation = originalSender;
    process.env.NODE_ENV = originalNodeEnv;
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalApiKey;
    if (originalFrom === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = originalFrom;
  }
});

test("LIST-01: Owner hoặc Lead lấy danh sách lời mời khi chưa có lời mời trả về 200 và mảng rỗng []", async () => {
  const { response, data } = await request(`/api/groups/${OWNER_USER.id ? "90000000-0000-0000-0000-000000000001" : ""}/invitations`, {
    token: getAuthToken(OWNER_USER),
  });
  assert.equal(response.status, 200);
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.data));
});

test("LIST-02: Member thông thường lấy danh sách lời mời bị từ chối 403 FORBIDDEN", async () => {
  const { response, data } = await request("/api/groups/90000000-0000-0000-0000-000000000001/invitations", {
    token: getAuthToken(MEMBER_USER),
  });
  assert.equal(response.status, 403);
  assert.equal(data.success, false);
  assert.equal(data.error, "FORBIDDEN");
});

test("LIST-03: Chưa đăng nhập khi lấy danh sách lời mời bị từ chối 401 UNAUTHORIZED", async () => {
  const { response, data } = await request("/api/groups/90000000-0000-0000-0000-000000000001/invitations");
  assert.equal(response.status, 401);
  assert.equal(data.success, false);
});

test("LIST-04: Lấy danh sách lời mời của nhóm không tồn tại trả về 404 GROUP_NOT_FOUND", async () => {
  const { response, data } = await request("/api/groups/00000000-0000-0000-0000-000000000000/invitations", {
    token: getAuthToken(OWNER_USER),
  });
  assert.equal(response.status, 404);
  assert.equal(data.success, false);
  assert.equal(data.error, "GROUP_NOT_FOUND");
});


// ==========================================
// 7. TẠO TÀI KHOẢN TỪ LỜI MỜI (GET /:token/account, POST /:token/register)
// ==========================================

async function createInviteToken(email) {
  EmailService.sendGroupInvitation = async () => ({ id: "ok" });
  const createRes = await request(`/api/groups/${testGroup.id}/invitations`, {
    method: "POST",
    token: getAuthToken(OWNER_USER),
    body: { email },
  });
  assert.equal(createRes.response.status, 201);
  return createRes.data.data.inviteLink.split("/invite/")[1];
}

test("ACCOUNT-01: Hỏi trạng thái tài khoản của email được mời (đã có / chưa có)", async () => {
  const existingToken = await createInviteToken(TARGET_USER.email);
  const existing = await request(`/api/invitations/${existingToken}/account`);
  assert.equal(existing.response.status, 200);
  assert.deepEqual(existing.data.data, { email: TARGET_USER.email, hasAccount: true });

  usersById.delete(NEW_USER.id);
  const newToken = await createInviteToken(NEW_USER.email);
  const fresh = await request(`/api/invitations/${newToken}/account`);
  assert.deepEqual(fresh.data.data, { email: NEW_USER.email, hasAccount: false });
  usersById.set(NEW_USER.id, NEW_USER);
});

test("ACCOUNT-02: Token không hợp lệ thì không lộ trạng thái tài khoản (404)", async () => {
  const { response, data } = await request("/api/invitations/invalid-token/account");
  assert.equal(response.status, 404);
  assert.equal(data.error, "INVITATION_NOT_FOUND");
});

test("ACCOUNT-03: Người chưa có tài khoản tạo tài khoản bằng token lời mời, đăng nhập luôn rồi chấp nhận lời mời", async () => {
  usersById.delete(NEW_USER.id);
  const token = await createInviteToken(NEW_USER.email);

  let createdWith;
  UserModel.createConfirmedInAuth = async ({ email, password, fullName }) => {
    createdWith = { email, password, fullName };
    usersById.set(NEW_USER.id, NEW_USER);
    return { ...NEW_USER, user_metadata: { full_name: fullName } };
  };

  const { response, data } = await request(`/api/invitations/${token}/register`, {
    method: "POST",
    body: { fullName: "Người Mới", password: "matkhau-12345" },
  });

  assert.equal(response.status, 201);
  assert.ok(data.data.accessToken);
  assert.equal(data.data.user.email, NEW_USER.email);
  // Email lấy từ lời mời, không lấy từ client
  assert.deepEqual(createdWith, { email: NEW_USER.email, password: "matkhau-12345", fullName: "Người Mới" });

  const acceptRes = await request(`/api/invitations/${token}/accept`, {
    method: "POST",
    token: data.data.accessToken,
  });
  assert.equal(acceptRes.response.status, 200);
  assert.equal(acceptRes.data.data.member.userId, NEW_USER.id);
});

test("ACCOUNT-04: Email đã có tài khoản thì không tạo mới (409 ACCOUNT_EXISTS)", async () => {
  const token = await createInviteToken(TARGET_USER.email);
  UserModel.createConfirmedInAuth = async () => {
    throw new Error("không được gọi");
  };
  const { response, data } = await request(`/api/invitations/${token}/register`, {
    method: "POST",
    body: { fullName: "Kẻ Mạo Danh", password: "matkhau-12345" },
  });
  assert.equal(response.status, 409);
  assert.equal(data.error, "ACCOUNT_EXISTS");
});

test("ACCOUNT-05: Token đã dùng / hết hạn / sai thì không tạo được tài khoản", async () => {
  usersById.delete(NEW_USER.id);
  UserModel.createConfirmedInAuth = async () => {
    throw new Error("không được gọi");
  };

  const bad = await request("/api/invitations/invalid-token/register", {
    method: "POST",
    body: { fullName: "A", password: "matkhau-12345" },
  });
  assert.equal(bad.response.status, 404);

  const token = await createInviteToken(NEW_USER.email);
  const inv = Array.from(GroupInvitationModel.store.values()).find((i) => i.email === NEW_USER.email);
  inv.expires_at = new Date(Date.now() - 1000).toISOString();
  const expired = await request(`/api/invitations/${token}/register`, {
    method: "POST",
    body: { fullName: "A", password: "matkhau-12345" },
  });
  assert.equal(expired.response.status, 400);
  assert.equal(expired.data.error, "INVITATION_EXPIRED");
  usersById.set(NEW_USER.id, NEW_USER);
});

test("ACCOUNT-06: Mật khẩu ngắn hoặc thiếu họ tên bị từ chối (400)", async () => {
  usersById.delete(NEW_USER.id);
  const token = await createInviteToken(NEW_USER.email);
  UserModel.createConfirmedInAuth = async () => {
    throw new Error("không được gọi");
  };
  const short = await request(`/api/invitations/${token}/register`, {
    method: "POST",
    body: { fullName: "A", password: "123" },
  });
  assert.equal(short.response.status, 400);

  const noName = await request(`/api/invitations/${token}/register`, {
    method: "POST",
    body: { fullName: "", password: "matkhau-12345" },
  });
  assert.equal(noName.response.status, 400);
  usersById.set(NEW_USER.id, NEW_USER);
});
