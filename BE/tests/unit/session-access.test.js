import assert from "node:assert/strict";
import { afterEach, before, describe, test } from "node:test";

// supabase.config ném lỗi khi thiếu URL lúc import → đặt env giả trước khi nạp service
process.env.SUPABASE_URL ||= "http://127.0.0.1:9";
process.env.SUPABASE_ANON_KEY ||= "test-anon-key";

let sessionService, availabilityService, SessionModel, GroupModel, GroupMemberModel, AvailabilityModel;
const originals = [];
const stub = (target, name, fn) => {
  originals.push([target, name, target[name]]);
  target[name] = fn;
};

before(async () => {
  ({ default: sessionService } = await import("../../src/services/session.service.js"));
  ({ default: availabilityService } = await import("../../src/services/availability.service.js"));
  ({ default: SessionModel } = await import("../../src/models/session.model.js"));
  ({ default: GroupModel } = await import("../../src/models/group.model.js"));
  ({ default: GroupMemberModel } = await import("../../src/models/group-member.model.js"));
  ({ default: AvailabilityModel } = await import("../../src/models/availability.model.js"));
});

afterEach(() => {
  while (originals.length) {
    const [target, name, fn] = originals.pop();
    target[name] = fn;
  }
});

const GROUP = "g1";
const session = (extra = {}) => ({ id: "s1", group_id: GROUP, title: "Họp", created_by: "creator", ...extra });
const memberOf = (roles) => async (groupId, userId) =>
  groupId === GROUP && roles[userId] ? { user_id: userId, role: roles[userId] } : null;
const rejectsWith = (promise, statusCode) =>
  assert.rejects(promise, (err) => {
    assert.equal(err.statusCode, statusCode);
    return true;
  });
const noCall = (what) => async () => assert.fail(`không được gọi ${what}`);

describe("SessionService.getSessions", () => {
  test("thành viên: resolve slug nhóm rồi trả danh sách", async () => {
    let queriedGroupId;
    stub(GroupModel, "findByIdOrSlug", async (id) => (id === "nhom-a" ? { id: GROUP } : null));
    stub(GroupMemberModel, "findMember", memberOf({ u1: "member" }));
    stub(SessionModel, "findAll", async ({ groupId }) => {
      queriedGroupId = groupId;
      return [session()];
    });

    const list = await sessionService.getSessions({ groupId: "nhom-a" }, "u1");
    assert.equal(queriedGroupId, GROUP);
    assert.equal(list.length, 1);
    assert.equal(list[0].id, "s1");
  });

  test("không phải thành viên → 403, không truy vấn session", async () => {
    stub(GroupModel, "findByIdOrSlug", async () => ({ id: GROUP }));
    stub(GroupMemberModel, "findMember", memberOf({}));
    stub(SessionModel, "findAll", noCall("findAll"));
    await rejectsWith(sessionService.getSessions({ groupId: GROUP }, "u2"), 403);
  });

  test("không tìm thấy nhóm → 404", async () => {
    stub(GroupModel, "findByIdOrSlug", async () => null);
    await rejectsWith(sessionService.getSessions({ groupId: "khong-co" }, "u1"), 404);
  });

  test("thiếu groupId → []", async () => {
    stub(GroupModel, "findByIdOrSlug", noCall("findByIdOrSlug"));
    assert.deepEqual(await sessionService.getSessions({}, "u1"), []);
  });
});

describe("SessionService.getSessionById", () => {
  test("thành viên → trả session", async () => {
    stub(SessionModel, "findById", async () => session());
    stub(GroupMemberModel, "findMember", memberOf({ u1: "member" }));
    const result = await sessionService.getSessionById("s1", "u1");
    assert.equal(result.id, "s1");
    assert.equal(result.groupId, GROUP);
  });

  test("không phải thành viên → 403", async () => {
    stub(SessionModel, "findById", async () => session());
    stub(GroupMemberModel, "findMember", memberOf({}));
    await rejectsWith(sessionService.getSessionById("s1", "u2"), 403);
  });

  test("không tìm thấy session → 404", async () => {
    stub(SessionModel, "findById", async () => null);
    await rejectsWith(sessionService.getSessionById("s404", "u1"), 404);
  });
});

describe("SessionService.createSession", () => {
  test("trưởng nhóm (lead) được tạo", async () => {
    let createdBy;
    stub(GroupMemberModel, "findMember", memberOf({ u1: "lead" }));
    stub(SessionModel, "create", async (p) => {
      createdBy = p.createdBy;
      return { id: "s1" };
    });
    stub(SessionModel, "findById", async () => session({ created_by: "u1" }));
    const result = await sessionService.createSession({ groupId: GROUP, title: "Họp" }, "u1");
    assert.equal(createdBy, "u1");
    assert.equal(result.id, "s1");
  });

  test("chủ nhóm (owner) được tạo", async () => {
    stub(GroupMemberModel, "findMember", memberOf({ u1: "owner" }));
    stub(SessionModel, "create", async () => ({ id: "s1" }));
    stub(SessionModel, "findById", async () => session({ created_by: "u1" }));
    const result = await sessionService.createSession({ groupId: GROUP, title: "Họp" }, "u1");
    assert.equal(result.id, "s1");
  });

  test("thành viên thường → 403, không tạo", async () => {
    stub(GroupMemberModel, "findMember", memberOf({ u1: "member" }));
    stub(SessionModel, "create", noCall("create"));
    await rejectsWith(sessionService.createSession({ groupId: GROUP, title: "Họp" }, "u1"), 403);
  });

  test("không phải thành viên → 403, không tạo", async () => {
    stub(GroupMemberModel, "findMember", memberOf({}));
    stub(SessionModel, "create", noCall("create"));
    await rejectsWith(sessionService.createSession({ groupId: GROUP, title: "Họp" }, "u2"), 403);
  });

  test("nhóm không tồn tại (không có bản ghi thành viên) → 403", async () => {
    stub(GroupMemberModel, "findMember", async () => null);
    stub(SessionModel, "create", noCall("create"));
    await rejectsWith(sessionService.createSession({ groupId: "gX", title: "Họp" }, "u1"), 403);
  });

  test("thiếu title / groupId → 400", async () => {
    await rejectsWith(sessionService.createSession({ groupId: GROUP }, "u1"), 400);
    await rejectsWith(sessionService.createSession({ title: "Họp" }, "u1"), 400);
  });
});

describe("SessionService.deleteSession", () => {
  const roles = { creator: "member", plain: "member", lead: "lead", owner: "owner" };

  test("người tạo được xoá", async () => {
    stub(SessionModel, "findById", async () => session());
    stub(GroupMemberModel, "findMember", memberOf(roles));
    stub(SessionModel, "delete", async () => true);
    assert.deepEqual(await sessionService.deleteSession("s1", "creator"), { id: "s1", deleted: true });
  });

  test("thành viên thường không phải người tạo → 403", async () => {
    stub(SessionModel, "findById", async () => session());
    stub(GroupMemberModel, "findMember", memberOf(roles));
    stub(SessionModel, "delete", noCall("delete"));
    await rejectsWith(sessionService.deleteSession("s1", "plain"), 403);
  });

  test("người ngoài nhóm → 403", async () => {
    stub(SessionModel, "findById", async () => session());
    stub(GroupMemberModel, "findMember", memberOf(roles));
    stub(SessionModel, "delete", noCall("delete"));
    await rejectsWith(sessionService.deleteSession("s1", "stranger"), 403);
  });

  test("created_by NULL + thành viên thường → 403", async () => {
    stub(SessionModel, "findById", async () => session({ created_by: null }));
    stub(GroupMemberModel, "findMember", memberOf(roles));
    stub(SessionModel, "delete", noCall("delete"));
    await rejectsWith(sessionService.deleteSession("s1", "plain"), 403);
  });

  test("created_by NULL + lead → xoá được", async () => {
    stub(SessionModel, "findById", async () => session({ created_by: null }));
    stub(GroupMemberModel, "findMember", memberOf(roles));
    stub(SessionModel, "delete", async () => true);
    assert.deepEqual(await sessionService.deleteSession("s1", "lead"), { id: "s1", deleted: true });
  });

  test("owner xoá phiên của người khác", async () => {
    stub(SessionModel, "findById", async () => session());
    stub(GroupMemberModel, "findMember", memberOf(roles));
    stub(SessionModel, "delete", async () => true);
    assert.deepEqual(await sessionService.deleteSession("s1", "owner"), { id: "s1", deleted: true });
  });

  test("không tìm thấy session → 404", async () => {
    stub(SessionModel, "findById", async () => null);
    await rejectsWith(sessionService.deleteSession("s404", "lead"), 404);
  });
});

describe("AvailabilityService.getSessionAvailabilities", () => {
  const slotRow = { id: "r1", session_id: "s1", user_id: "u1", member_name: "An", role: "member", group_role: "core",
    avatar_url: null, day_index: 0, date_str: "2026-11-02", start_minutes: 480, end_minutes: 540, label: "Available", note: "" };

  const memberRow = (userId, role, name) => ({ user_id: userId, role, group_role: "core", full_name: name, avatar_url: null });

  test("thành viên → nhóm slot theo user, tên/vai trò lấy từ danh sách thành viên", async () => {
    stub(SessionModel, "findById", async () => session());
    stub(GroupMemberModel, "findMember", memberOf({ u1: "member" }));
    stub(GroupMemberModel, "getGroupMembers", async () => [memberRow("u1", "member", "An")]);
    stub(AvailabilityModel, "findAllBySession", async () => [slotRow, { ...slotRow, id: "r2", start_minutes: 600 }]);
    const result = await availabilityService.getSessionAvailabilities("s1", "u1");
    assert.equal(result.length, 1);
    assert.equal(result[0].slots.length, 2);
    assert.equal(result[0].memberName, "An");
  });

  test("trả đủ mọi thành viên (chưa nhập lịch → slots rỗng); bỏ slot của người đã rời nhóm", async () => {
    stub(SessionModel, "findById", async () => session());
    stub(GroupMemberModel, "findMember", memberOf({ u1: "member" }));
    stub(GroupMemberModel, "getGroupMembers", async () => [
      memberRow("lead", "owner", "Lead"), memberRow("u1", "member", "An"), memberRow("u3", "member", "Ba"),
    ]);
    stub(AvailabilityModel, "findAllBySession", async () => [slotRow, { ...slotRow, id: "x", user_id: "left-user" }]);
    const result = await availabilityService.getSessionAvailabilities("s1", "u1");
    assert.deepEqual(result.map((m) => [m.memberName, m.slots.length]), [["Lead", 0], ["An", 1], ["Ba", 0]]);
  });

  test("không phải thành viên → 403, không đọc lịch", async () => {
    stub(SessionModel, "findById", async () => session());
    stub(GroupMemberModel, "findMember", memberOf({}));
    stub(AvailabilityModel, "findAllBySession", noCall("findAllBySession"));
    stub(GroupMemberModel, "getGroupMembers", noCall("getGroupMembers"));
    await rejectsWith(availabilityService.getSessionAvailabilities("s1", "u2"), 403);
  });

  test("không tìm thấy session → 404", async () => {
    stub(SessionModel, "findById", async () => null);
    await rejectsWith(availabilityService.getSessionAvailabilities("s404", "u1"), 404);
  });
});

describe("SessionService.updateNote", () => {
  test("trưởng nhóm sửa ghi chú → lưu bản đã trim, trả session mới", async () => {
    let saved;
    stub(SessionModel, "findById", async () => session({ description: saved ?? "" }));
    stub(GroupMemberModel, "findMember", memberOf({ lead: "lead" }));
    stub(SessionModel, "update", async (id, fields) => { saved = fields.description; return true; });
    const result = await sessionService.updateNote("s1", "lead", "  Mang laptop nhé  ");
    assert.equal(saved, "Mang laptop nhé");
    assert.equal(result.description, "Mang laptop nhé");
  });

  test("chuỗi rỗng = xoá ghi chú", async () => {
    let saved = "cũ";
    stub(SessionModel, "findById", async () => session({ description: saved }));
    stub(GroupMemberModel, "findMember", memberOf({ owner: "owner" }));
    stub(SessionModel, "update", async (id, fields) => { saved = fields.description; return true; });
    await sessionService.updateNote("s1", "owner", "   ");
    assert.equal(saved, "");
  });

  test("thành viên thường → 403, không ghi DB", async () => {
    stub(SessionModel, "findById", async () => session());
    stub(GroupMemberModel, "findMember", memberOf({ u1: "member" }));
    stub(SessionModel, "update", noCall("update"));
    await rejectsWith(sessionService.updateNote("s1", "u1", "x"), 403);
  });

  test("ghi chú sai kiểu hoặc quá 500 ký tự → 400, không chạm DB", async () => {
    stub(SessionModel, "findById", noCall("findById"));
    await rejectsWith(sessionService.updateNote("s1", "lead", 123), 400);
    await rejectsWith(sessionService.updateNote("s1", "lead", "x".repeat(501)), 400);
  });

  test("không tìm thấy session → 404", async () => {
    stub(SessionModel, "findById", async () => null);
    await rejectsWith(sessionService.updateNote("s404", "lead", "x"), 404);
  });
});
