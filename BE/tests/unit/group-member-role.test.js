import assert from "node:assert/strict";
import { afterEach, before, describe, test } from "node:test";

process.env.SUPABASE_URL ||= "http://127.0.0.1:9";
process.env.SUPABASE_ANON_KEY ||= "test-anon-key";

let service, GroupModel, GroupMemberModel, RealtimeService;
const originals = [];
const stub = (target, name, fn) => {
  originals.push([target, name, target[name]]);
  target[name] = fn;
};

before(async () => {
  const { default: GroupMemberService } = await import("../../src/services/group-member.service.js");
  service = new GroupMemberService();
  ({ default: GroupModel } = await import("../../src/models/group.model.js"));
  ({ default: GroupMemberModel } = await import("../../src/models/group-member.model.js"));
  ({ default: RealtimeService } = await import("../../src/services/realtime.service.js"));
});

afterEach(() => {
  while (originals.length) {
    const [target, name, fn] = originals.pop();
    target[name] = fn;
  }
});

const GROUP = "11111111-1111-4111-8111-111111111111";
const ids = {
  owner: "00000000-0000-4000-8000-000000000001",
  lead: "00000000-0000-4000-8000-000000000002",
  member: "00000000-0000-4000-8000-000000000003",
  member2: "00000000-0000-4000-8000-000000000004",
};
const roles = { [ids.owner]: "owner", [ids.lead]: "lead", [ids.member]: "member", [ids.member2]: "member" };

function setup({ promote } = {}) {
  stub(GroupModel, "findByIdOrSlug", async () => ({ id: GROUP }));
  stub(GroupMemberModel, "findMember", async (groupId, userId) =>
    roles[userId] ? { user_id: userId, role: roles[userId] } : null);
  stub(GroupMemberModel, "promoteToLead", promote ?? (async (groupId, userId) => ({ user_id: userId, role: "lead" })));
  stub(RealtimeService, "broadcastGroupUpdate", () => {});
}
const rejectsWith = (promise, statusCode) =>
  assert.rejects(promise, (err) => {
    assert.equal(err.statusCode, statusCode);
    return true;
  });
const noCall = (what) => async () => assert.fail(`không được gọi ${what}`);

describe("GroupMemberService.promoteToLead", () => {
  test("owner nâng member lên lead", async () => {
    setup();
    const result = await service.promoteToLead(GROUP, ids.owner, ids.member);
    assert.equal(result.role, "lead");
  });

  test("lead cũng nâng được member", async () => {
    setup();
    assert.equal((await service.promoteToLead(GROUP, ids.lead, ids.member)).role, "lead");
  });

  test("member thường không được nâng ai → 403", async () => {
    setup({ promote: noCall("promoteToLead") });
    await rejectsWith(service.promoteToLead(GROUP, ids.member, ids.member2), 403);
  });

  test("người đã là lead/owner → 409, không ghi DB", async () => {
    setup({ promote: noCall("promoteToLead") });
    await rejectsWith(service.promoteToLead(GROUP, ids.owner, ids.lead), 409);
    await rejectsWith(service.promoteToLead(GROUP, ids.lead, ids.owner), 409);
  });

  test("hai người nâng cùng lúc: lần ghi thứ hai không đổi được dòng nào → 409", async () => {
    setup({ promote: async () => null });
    await rejectsWith(service.promoteToLead(GROUP, ids.owner, ids.member), 409);
  });

  test("không phải thành viên / id sai → 404 / 400", async () => {
    setup({ promote: noCall("promoteToLead") });
    await rejectsWith(service.promoteToLead(GROUP, ids.owner, "99999999-9999-4999-8999-999999999999"), 404);
    await rejectsWith(service.promoteToLead(GROUP, ids.owner, "abc"), 400);
  });
});

describe("GroupMemberService.removeMember", () => {
  test("lead không xoá được lead khác, không ai xoá được owner", async () => {
    setup();
    stub(GroupMemberModel, "removeMember", noCall("removeMember"));
    await rejectsWith(service.removeMember(GROUP, ids.lead, ids.owner), 403);
    roles[ids.member2] = "lead";
    try {
      await rejectsWith(service.removeMember(GROUP, ids.lead, ids.member2), 403);
    } finally {
      roles[ids.member2] = "member";
    }
  });

  test("lead xoá member → gọi model xoá (kèm lịch rảnh ở phiên chưa chốt)", async () => {
    setup();
    let removed;
    stub(GroupMemberModel, "removeMember", async (groupId, userId) => { removed = userId; return true; });
    await service.removeMember(GROUP, ids.lead, ids.member);
    assert.equal(removed, ids.member);
  });
});
