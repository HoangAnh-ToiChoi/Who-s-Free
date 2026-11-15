import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";

process.env.SUPABASE_URL ||= "http://127.0.0.1:9";
process.env.SUPABASE_ANON_KEY ||= "test-anon-key";

const originalNodeEnv = process.env.NODE_ENV;
let pool, GroupInvitationModel, originalQuery;

before(async () => {
  ({ pool } = await import("../../src/configs/db.config.js"));
  ({ default: GroupInvitationModel } = await import("../../src/models/group-invitation.model.js"));
  originalQuery = pool.query;
  process.env.NODE_ENV = "development";
});

afterEach(() => {
  pool.query = originalQuery;
  GroupInvitationModel.clear();
});

after(async () => {
  process.env.NODE_ENV = originalNodeEnv;
  await pool.end();
});

const INVITE = {
  groupId: "11111111-1111-4111-8111-111111111111",
  email: " Member@Example.com ",
  tokenHash: "hash-1",
  invitedBy: "00000000-0000-4000-8000-000000000001",
  expiresAt: new Date(Date.now() + 86_400_000),
};

const dbDown = () => {
  pool.query = async () => {
    throw new Error('relation "public.group_invitations" does not exist');
  };
};

test("create: lưu vào DB, chuẩn hoá email, không ghi vào store bộ nhớ", async () => {
  const calls = [];
  pool.query = async (sql, params) => {
    calls.push({ sql, params });
    return { rows: [{ id: params[0], email: params[2], status: "pending" }] };
  };

  const row = await GroupInvitationModel.create(INVITE);

  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /INSERT INTO public\.group_invitations/);
  assert.doesNotMatch(calls[0].sql, /\*/);
  assert.equal(row.email, "member@example.com");
  assert.equal(GroupInvitationModel.store.size, 0);
});

test("create: DB lỗi thì ném lỗi, không âm thầm lưu tạm vào RAM", async () => {
  dbDown();
  await assert.rejects(GroupInvitationModel.create(INVITE), /does not exist/);
  assert.equal(GroupInvitationModel.store.size, 0);
});

test("đọc: DB lỗi thì ném lỗi thay vì trả dữ liệu từ RAM", async () => {
  dbDown();
  await assert.rejects(GroupInvitationModel.findById("inv-1"), /does not exist/);
  await assert.rejects(GroupInvitationModel.findByTokenHash("hash-1"), /does not exist/);
  await assert.rejects(GroupInvitationModel.findPendingByGroupId(INVITE.groupId), /does not exist/);
  await assert.rejects(GroupInvitationModel.findActiveByGroupAndEmail(INVITE.groupId, INVITE.email), /does not exist/);
});

test("ghi: DB lỗi thì updateStatus / revoke / delete đều ném lỗi", async () => {
  dbDown();
  await assert.rejects(GroupInvitationModel.updateStatus("inv-1", { status: "revoked" }), /does not exist/);
  await assert.rejects(
    GroupInvitationModel.revokeActiveByGroupAndEmail(INVITE.groupId, INVITE.email, INVITE.invitedBy),
    /does not exist/
  );
  await assert.rejects(GroupInvitationModel.delete("inv-1"), /does not exist/);
});

test("findById: không tìm thấy trả về null", async () => {
  pool.query = async () => ({ rows: [] });
  assert.equal(await GroupInvitationModel.findById("missing"), null);
});

test("input rỗng: trả giá trị mặc định, không gọi DB", async () => {
  pool.query = async () => assert.fail("không được gọi DB");
  assert.equal(await GroupInvitationModel.findById(null), null);
  assert.equal(await GroupInvitationModel.findByTokenHash(""), null);
  assert.deepEqual(await GroupInvitationModel.findPendingByGroupId(null), []);
  assert.equal(await GroupInvitationModel.findActiveByGroupAndEmail(INVITE.groupId, ""), null);
});
