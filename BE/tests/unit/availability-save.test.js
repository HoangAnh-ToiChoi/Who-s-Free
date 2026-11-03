import assert from "node:assert/strict";
import { afterEach, before, describe, test } from "node:test";

// supabase.config ném lỗi khi thiếu URL lúc import → đặt env giả trước khi nạp service
process.env.SUPABASE_URL ||= "http://127.0.0.1:9";
process.env.SUPABASE_ANON_KEY ||= "test-anon-key";

let AvailabilityService, AvailabilityModel, SessionModel, GroupMemberModel, RealtimeService;
const originals = [];
const stub = (target, name, fn) => {
  originals.push([target, name, target[name]]);
  target[name] = fn;
};

before(async () => {
  ({ default: AvailabilityService } = await import("../../src/services/availability.service.js"));
  ({ default: AvailabilityModel } = await import("../../src/models/availability.model.js"));
  ({ default: SessionModel } = await import("../../src/models/session.model.js"));
  ({ default: GroupMemberModel } = await import("../../src/models/group-member.model.js"));
  ({ default: RealtimeService } = await import("../../src/services/realtime.service.js"));
});

afterEach(() => {
  while (originals.length) {
    const [target, name, fn] = originals.pop();
    target[name] = fn;
  }
});

const row = { id: "r1", session_id: "s1", user_id: "u1", day_index: 2, date_str: "2026-11-04", start_minutes: 780, end_minutes: 1020, label: "Available", note: "" };
const slot = { dayIndex: 2, dateStr: "2026-11-04", startMinutes: 780, endMinutes: 1020 };

const service = () => (typeof AvailabilityService === "function" ? new AvailabilityService() : AvailabilityService);

describe("AvailabilityService.saveMyAvailability", () => {
  test("lưu thành công: trả slot vừa ghi và phát đúng MỘT broadcast", async () => {
    const broadcasts = [];
    stub(SessionModel, "findById", async () => ({ id: "s1", group_id: "g1", status: "active_poll" }));
    stub(GroupMemberModel, "findMember", async () => ({ user_id: "u1" }));
    stub(AvailabilityModel, "replaceUserSlots", async () => [row]);
    stub(AvailabilityModel, "findBySessionAndUser", async () => assert.fail("không cần đọc lại sau khi ghi"));
    stub(RealtimeService, "broadcastSlotUpdate", async (...args) => broadcasts.push(args));

    const result = await service().saveMyAvailability("s1", "u1", [slot]);
    assert.equal(result.slots.length, 1);
    assert.equal(result.slots[0].startMinutes, 780);
    assert.deepEqual(broadcasts, [["s1", { sessionId: "s1" }]]);
  });

  test("phiên vừa được chốt trong lúc ghi (model trả null) → 409, không broadcast", async () => {
    let broadcasted = false;
    stub(SessionModel, "findById", async () => ({ id: "s1", group_id: "g1", status: "active_poll" }));
    stub(GroupMemberModel, "findMember", async () => ({ user_id: "u1" }));
    stub(AvailabilityModel, "replaceUserSlots", async () => null);
    stub(AvailabilityModel, "findBySessionAndUser", async () => [row]);
    stub(RealtimeService, "broadcastSlotUpdate", async () => { broadcasted = true; });

    await assert.rejects(service().saveMyAvailability("s1", "u1", [slot]), (err) => {
      assert.equal(err.statusCode, 409);
      assert.equal(err.errorCode, "SESSION_FINALIZED");
      // Trả kèm slot THẬT trên server để client khớp lại, bỏ slot chưa được lưu
      assert.equal(err.details.status, "finalized");
      assert.deepEqual(err.details.slots.map((s) => s.id), ["r1"]);
      return true;
    });
    assert.equal(broadcasted, false);
  });

  test("phiên đã chốt từ trước → 409 kèm slot server, không ghi", async () => {
    stub(SessionModel, "findById", async () => ({ id: "s1", group_id: "g1", status: "finalized" }));
    stub(GroupMemberModel, "findMember", async () => ({ user_id: "u1" }));
    stub(AvailabilityModel, "replaceUserSlots", async () => assert.fail("không được ghi"));
    stub(AvailabilityModel, "findBySessionAndUser", async () => []);
    await assert.rejects(service().saveMyAvailability("s1", "u1", [slot]), (err) => err.statusCode === 409 && Array.isArray(err.details.slots));
  });

  test("không tìm thấy phiên → 404", async () => {
    stub(SessionModel, "findById", async () => null);
    await assert.rejects(service().saveMyAvailability("s1", "u1", [slot]), { statusCode: 404 });
  });

  test("slots không phải mảng → 400", async () => {
    await assert.rejects(service().saveMyAvailability("s1", "u1", "x"), { statusCode: 400 });
  });
});
