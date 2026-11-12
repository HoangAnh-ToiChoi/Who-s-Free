import assert from "node:assert/strict";
import { afterEach, before, describe, test } from "node:test";

process.env.SUPABASE_URL ||= "http://127.0.0.1:9";
process.env.SUPABASE_ANON_KEY ||= "test-anon-key";

let service, SessionModel, GroupMemberModel, RealtimeService, EmailService;
const originals = [];
const stub = (target, name, fn) => {
  originals.push([target, name, target[name]]);
  target[name] = fn;
};

before(async () => {
  ({ default: service } = await import("../../src/services/session-finalize.service.js"));
  ({ default: SessionModel } = await import("../../src/models/session.model.js"));
  ({ default: GroupMemberModel } = await import("../../src/models/group-member.model.js"));
  ({ default: RealtimeService } = await import("../../src/services/realtime.service.js"));
  ({ default: EmailService } = await import("../../src/services/email.service.js"));
});

afterEach(() => {
  while (originals.length) {
    const [target, name, fn] = originals.pop();
    target[name] = fn;
  }
});

const session = { id: "s1", group_id: "g1", slug: "s", title: "Họp", status: "active_poll" };
const asLead = () => stub(GroupMemberModel, "findMember", async () => ({ role: "lead" }));

describe("startFinalizing / stopFinalizing", () => {
  test("trưởng nhóm mở bảng: đánh dấu 10 phút, phát realtime, trả session", async () => {
    const calls = [];
    const events = [];
    stub(SessionModel, "findById", async () => session);
    asLead();
    stub(SessionModel, "startFinalizing", async (...args) => calls.push(args) > 0);
    stub(RealtimeService, "broadcast", async (...args) => events.push(args[1]));
    const result = await service.startFinalizing("s1", "lead1");
    assert.deepEqual(calls, [["s1", "lead1", 10]]);
    assert.deepEqual(events, ["SESSION_FINALIZING"]);
    assert.equal(result.id, "s1");
  });

  test("trưởng nhóm khác đang chốt → 409; thành viên thường → 403; phiên đã chốt → 409", async () => {
    stub(SessionModel, "findById", async () => session);
    asLead();
    stub(SessionModel, "startFinalizing", async () => false);
    await assert.rejects(service.startFinalizing("s1", "lead2"), { statusCode: 409, errorCode: "SESSION_FINALIZING_BY_OTHER" });

    stub(GroupMemberModel, "findMember", async () => ({ role: "member" }));
    await assert.rejects(service.startFinalizing("s1", "u1"), { statusCode: 403 });

    asLead();
    stub(SessionModel, "findById", async () => ({ ...session, status: "finalized" }));
    await assert.rejects(service.startFinalizing("s1", "lead1"), { statusCode: 409, errorCode: "SESSION_FINALIZED" });
  });

  test("đóng bảng: chỉ phát realtime khi thực sự bỏ được đánh dấu", async () => {
    const events = [];
    stub(SessionModel, "findById", async () => session);
    asLead();
    stub(RealtimeService, "broadcast", async (...args) => events.push(args[1]));
    stub(SessionModel, "stopFinalizing", async () => true);
    await service.stopFinalizing("s1", "lead1");
    stub(SessionModel, "stopFinalizing", async () => false);
    await service.stopFinalizing("s1", "lead1");
    assert.deepEqual(events, ["SESSION_FINALIZING"]);
  });
});

describe("finalizeSession (kiểm tra + ghi trong một lần khoá)", () => {
  const payload = { date: "2026-11-12", startMinutes: 900, endMinutes: 1020 };
  const rowsAt = (start, end) => [{ user_id: "u1", member_name: "A", date: "2026-11-12", start_minutes: start, end_minutes: end }];

  test("kiểm tra chạy trên lịch đọc trong transaction: khung không còn được chọn → 400 INVALID_FINAL_SLOT", async () => {
    stub(SessionModel, "findById", async () => session);
    asLead();
    // Trong lúc khoá, lịch mới nhất chỉ còn 15:00–16:00 → khung 15:00–17:00 không hợp lệ
    stub(SessionModel, "finalizeLocked", async (_id, _values, canFinalize) => (canFinalize(rowsAt(900, 960)) ? "ok" : "invalid"));
    await assert.rejects(service.finalizeSession("s1", "lead1", payload), { statusCode: 400, errorCode: "INVALID_FINAL_SLOT" });
  });

  test("hợp lệ → chốt, phát realtime, gửi mail; đã bị chốt trước → 409", async () => {
    const events = [];
    stub(SessionModel, "findById", async () => session);
    asLead();
    stub(SessionModel, "finalizeLocked", async (_id, values, canFinalize) => {
      assert.equal(values.finalizedBy, "lead1");
      return canFinalize(rowsAt(900, 1020)) ? "ok" : "invalid";
    });
    stub(SessionModel, "findGroupContacts", async () => [{ email: "a@test.dev" }]);
    stub(EmailService, "sendSessionFinalized", async () => ({ total: 1, sent: 1, failed: 0 }));
    stub(RealtimeService, "broadcast", async (...args) => events.push(args[1]));
    const result = await service.finalizeSession("s1", "lead1", payload);
    assert.equal(result.email.sent, 1);
    assert.deepEqual(events, ["SESSION_FINALIZED"]);

    stub(SessionModel, "finalizeLocked", async () => "already_finalized");
    await assert.rejects(service.finalizeSession("s1", "lead1", payload), { statusCode: 409, errorCode: "SESSION_FINALIZED" });
  });

  test("ngày sai định dạng → 400, không mở transaction", async () => {
    stub(SessionModel, "findById", async () => session);
    asLead();
    stub(SessionModel, "finalizeLocked", async () => assert.fail("không được chạy"));
    await assert.rejects(service.finalizeSession("s1", "lead1", { ...payload, date: "12/11" }), { errorCode: "INVALID_FINAL_SLOT" });
  });
});
