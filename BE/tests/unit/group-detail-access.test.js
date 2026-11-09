import assert from "node:assert/strict";
import { afterEach, before, describe, test } from "node:test";

process.env.SUPABASE_URL ||= "http://127.0.0.1:9";
process.env.SUPABASE_ANON_KEY ||= "test-anon-key";

let groupService, GroupModel;
let original;

before(async () => {
  const mod = await import("../../src/services/group.service.js");
  groupService = typeof mod.default === "function" ? new mod.default() : mod.default;
  ({ default: GroupModel } = await import("../../src/models/group.model.js"));
  original = GroupModel.findDetailByIdOrSlug;
});

afterEach(() => {
  GroupModel.findDetailByIdOrSlug = original;
});

const detail = (role) => ({ id: "g1", slug: "g1", name: "Đồ án", user_role: role, member_count: 2 });

describe("GroupService.getGroupDetail", () => {
  test("thành viên xem được chi tiết nhóm", async () => {
    GroupModel.findDetailByIdOrSlug = async () => detail("member");
    const group = await groupService.getGroupDetail("g1", "u1");
    assert.equal(group.id, "g1");
    assert.equal(group.userRole, "member");
  });

  test("không phải thành viên (user_role 'guest') → 403", async () => {
    GroupModel.findDetailByIdOrSlug = async () => detail("guest");
    await assert.rejects(groupService.getGroupDetail("g1", "outsider"), (err) => err.statusCode === 403);
  });

  test("không tìm thấy nhóm → 404", async () => {
    GroupModel.findDetailByIdOrSlug = async () => null;
    await assert.rejects(groupService.getGroupDetail("gX", "u1"), (err) => err.statusCode === 404);
  });
});
