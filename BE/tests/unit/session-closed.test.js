import assert from "node:assert/strict";
import { afterEach, before, describe, test } from "node:test";

process.env.SUPABASE_URL ||= "http://127.0.0.1:9";
process.env.SUPABASE_ANON_KEY ||= "test-anon-key";

let AvailabilityService, AvailabilityModel, SessionModel, GroupMemberModel, RealtimeService;
let sessionService, finalizeService, pool, toPublicSession, BLOCKED_CLOSED;
const originals = [];
const stub = (target, name, fn) => {
  originals.push([target, name, target[name]]);
  target[name] = fn;
};

before(async () => {
  ({ default: AvailabilityService } = await import("../../src/services/availability.service.js"));
  ({ default: AvailabilityModel, BLOCKED_CLOSED } = await import("../../src/models/availability.model.js"));
  ({ default: SessionModel } = await import("../../src/models/session.model.js"));
  ({ default: GroupMemberModel } = await import("../../src/models/group-member.model.js"));
  ({ default: RealtimeService } = await import("../../src/services/realtime.service.js"));
  ({ default: sessionService } = await import("../../src/services/session.service.js"));
  ({ default: finalizeService } = await import("../../src/services/session-finalize.service.js"));
  ({ pool } = await import("../../src/configs/db.config.js"));
  ({ toPublicSession } = await import("../../src/utils/mappers/session.mapper.js"));
});

afterEach(() => {
  while (originals.length) {
    const [target, name, fn] = originals.pop();
    target[name] = fn;
  }
});

const row = { id: "r1", session_id: "s1", user_id: "u1", day_index: 2, date_str: "2026-11-04", start_minutes: 780, end_minutes: 1020, label: "Available", note: "" };
const slot = { dayIndex: 2, dateStr: "2026-11-04", startMinutes: 780, endMinutes: 1020 };
const closedSession = { id: "s1", group_id: "g1", slug: "s", title: "Họp", status: "closed", start_date: "2026-11-01", end_date: "2026-11-10" };

describe("lưu lịch khi session đã đóng (closed)", () => {
  test("service: 409 SESSION_CLOSED kèm status + slot THẬT của user, không ghi, không broadcast", async () => {
    stub(SessionModel, "findById", async () => closedSession);
    stub(GroupMemberModel, "findMember", async () => ({ user_id: "u1", role: "member" }));
    stub(AvailabilityModel, "replaceUserSlots", async () => assert.fail("không được ghi"));
    stub(AvailabilityModel, "findBySessionAndUser", async () => [row]);
    stub(RealtimeService, "broadcastSlotUpdate", async () => assert.fail("không được broadcast"));

    await assert.rejects(AvailabilityService.saveMyAvailability("s1", "u1", [slot]), (err) => {
      assert.equal(err.statusCode, 409);
      assert.equal(err.errorCode, "SESSION_CLOSED");
      assert.equal(err.details.status, "closed");
      assert.deepEqual(err.details.slots.map((s) => s.id), ["r1"]);
      return true;
    });
  });

  test("race: model báo đóng giữa lúc kiểm tra và lúc ghi → vẫn 409 SESSION_CLOSED", async () => {
    stub(SessionModel, "findById", async () => ({ ...closedSession, status: "active_poll" }));
    stub(GroupMemberModel, "findMember", async () => ({ user_id: "u1" }));
    stub(AvailabilityModel, "replaceUserSlots", async () => BLOCKED_CLOSED);
    stub(AvailabilityModel, "findBySessionAndUser", async () => [row]);
    stub(RealtimeService, "broadcastSlotUpdate", async () => assert.fail("không được broadcast"));
    await assert.rejects(AvailabilityService.saveMyAvailability("s1", "u1", [slot]), { statusCode: 409, errorCode: "SESSION_CLOSED" });
  });

  test("không phải thành viên → 403 (không lộ trạng thái đóng); input sai → 400 trước khi đụng DB", async () => {
    stub(SessionModel, "findById", async () => closedSession);
    stub(GroupMemberModel, "findMember", async () => null);
    await assert.rejects(AvailabilityService.saveMyAvailability("s1", "u1", [slot]), { statusCode: 403 });
    await assert.rejects(AvailabilityService.saveMyAvailability("s1", "u1", [{ bad: true }]), { statusCode: 400 });
    await assert.rejects(AvailabilityService.saveMyAvailability("", "u1", [slot]), { statusCode: 400 });
  });

  test("session không tồn tại → 404", async () => {
    stub(SessionModel, "findById", async () => null);
    await assert.rejects(AvailabilityService.saveMyAvailability("s1", "u1", [slot]), { statusCode: 404 });
  });

  test("model (transaction): session closed → trả BLOCKED_CLOSED, không xoá/ghi slot, vẫn COMMIT", async () => {
    const sqls = [];
    const client = {
      query: async (sql) => {
        sqls.push(sql);
        return sql.includes("FROM public.sessions") ? { rows: [{ status: "closed", blocked: false }] } : { rows: [] };
      },
      release() {},
    };
    stub(pool, "connect", async () => client);

    assert.equal(await AvailabilityModel.replaceUserSlots("s1", "u1", [slot]), BLOCKED_CLOSED);
    assert.ok(!sqls.some((s) => /DELETE|INSERT/.test(s)), "không được xoá/chèn khi đã đóng");
    assert.equal(sqls.at(-1), "COMMIT");
  });

  test("model (transaction): session còn active_poll vẫn ghi bình thường", async () => {
    const sqls = [];
    const client = {
      query: async (sql) => {
        sqls.push(sql);
        if (sql.includes("FROM public.sessions")) return { rows: [{ status: "active_poll", blocked: false }] };
        if (sql.includes("RETURNING")) return { rows: [row] };
        return { rows: [] };
      },
      release() {},
    };
    stub(pool, "connect", async () => client);
    assert.deepEqual(await AvailabilityModel.replaceUserSlots("s1", "u1", [slot]), [row]);
    assert.ok(sqls.some((s) => /DELETE/.test(s)));
  });
});

describe("lead vẫn chốt được khi session closed", () => {
  const asLead = () => stub(GroupMemberModel, "findMember", async () => ({ role: "lead" }));

  test("finalizeSession: closed → chốt thành công (đi tới finalizeLocked)", async () => {
    stub(SessionModel, "findById", async () => closedSession);
    asLead();
    let locked = false;
    stub(SessionModel, "finalizeLocked", async () => {
      locked = true;
      return "ok";
    });
    stub(SessionModel, "findGroupContacts", async () => []);
    stub(RealtimeService, "broadcast", async () => {});
    const result = await finalizeService.finalizeSession("s1", "lead1", { date: "2026-11-05", startMinutes: 600, endMinutes: 660 });
    assert.equal(locked, true);
    assert.equal(result.session.id, "s1");
  });

  test("startFinalizing: closed → được phép mở bảng chốt", async () => {
    stub(SessionModel, "findById", async () => closedSession);
    asLead();
    stub(SessionModel, "startFinalizing", async () => true);
    stub(RealtimeService, "broadcast", async () => {});
    assert.equal((await finalizeService.startFinalizing("s1", "lead1")).id, "s1");
  });

  test("exportSchedule: closed → xuất được", async () => {
    stub(SessionModel, "findById", async () => closedSession);
    asLead();
    stub(AvailabilityModel, "findForSchedule", async () => []);
    const out = await finalizeService.exportSchedule("s1", "lead1");
    assert.ok(out.buffer.length > 0);
  });

  test("member thường vẫn không chốt được (403)", async () => {
    stub(SessionModel, "findById", async () => closedSession);
    stub(GroupMemberModel, "findMember", async () => ({ role: "member" }));
    await assert.rejects(finalizeService.finalizeSession("s1", "u1", {}), { statusCode: 403 });
  });
});

describe("updateSession: gia hạn / reset nhắc", () => {
  const base = { id: "s1", group_id: "g1", slug: "s", title: "Họp", status: "active_poll", start_date: "2026-11-01", end_date: "2026-11-10" };
  const setup = (session) => {
    const updates = [];
    stub(SessionModel, "findById", async () => session);
    stub(GroupMemberModel, "findMember", async () => ({ role: "lead" }));
    stub(SessionModel, "countSlotsOutsideWindow", async () => 0);
    stub(SessionModel, "update", async (id, changes) => updates.push({ id, changes }));
    return updates;
  };
  const future = (days) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

  test("đổi end_date: gửi reset_deadline để model xoá dấu nhắc và mở lại session closed", async () => {
    const updates = setup({ ...base, status: "closed", start_date: future(0), end_date: future(1) });
    await sessionService.updateSession("s1", "lead1", { startDate: future(0), endDate: future(5) });
    assert.equal(updates[0].changes.reset_deadline, true);
    assert.equal(updates[0].changes.end_date, future(5));
  });

  test("chỉ đổi tên, hoặc đổi start_date mà giữ nguyên end_date: KHÔNG reset nhắc", async () => {
    const s = { ...base, start_date: future(0), end_date: future(5) };
    const updates = setup(s);
    await sessionService.updateSession("s1", "lead1", { title: "Mới" });
    await sessionService.updateSession("s1", "lead1", { startDate: future(1), endDate: future(5) });
    assert.equal(updates[0].changes.reset_deadline, undefined);
    assert.equal(updates[1].changes.reset_deadline, undefined);
  });

  test("end_date không hợp lệ → 400, không ghi; session đã chốt → 409; không phải lead → 403; không tồn tại → 404", async () => {
    const updates = setup({ ...base, start_date: future(0), end_date: future(5) });
    await assert.rejects(sessionService.updateSession("s1", "lead1", { startDate: future(3), endDate: future(1) }), { statusCode: 400 });
    assert.equal(updates.length, 0);

    setup({ ...base, status: "finalized", start_date: future(0), end_date: future(5) });
    await assert.rejects(sessionService.updateSession("s1", "lead1", { startDate: future(0), endDate: future(9) }), { statusCode: 409 });

    stub(GroupMemberModel, "findMember", async () => ({ role: "member" }));
    await assert.rejects(sessionService.updateSession("s1", "u9", { title: "x" }), { statusCode: 403 });

    stub(SessionModel, "findById", async () => null);
    await assert.rejects(sessionService.updateSession("s1", "lead1", { title: "x" }), { statusCode: 404 });
  });

  test("SessionModel.update: SQL reset_deadline mở lại closed chỉ khi end_date mới >= hôm nay (VN), tham số đúng chỗ", async () => {
    const calls = [];
    stub(pool, "query", async (sql, params) => {
      calls.push({ sql, params });
      return { rowCount: 1 };
    });
    assert.equal(await SessionModel.update("s1", { start_date: "2026-11-01", end_date: "2026-11-20", date_range: "x", reset_deadline: true }), true);
    const { sql, params } = calls[0];
    assert.deepEqual(params, ["s1", "2026-11-01", "2026-11-20", "x"]);
    assert.match(sql, /reminder_sent_at = NULL/);
    assert.match(sql, /status = CASE WHEN status = 'closed' AND \$3::date >= \(NOW\(\) AT TIME ZONE 'Asia\/Ho_Chi_Minh'\)::date THEN 'active_poll'/);
    assert.match(sql, /closed_at = CASE/);
    assert.match(sql, /closed_notified_at = CASE/);
  });

  test("SessionModel.update: không có reset_deadline thì không đụng cột nhắc/đóng; không có cột hợp lệ thì false", async () => {
    const calls = [];
    stub(pool, "query", async (sql, params) => {
      calls.push({ sql, params });
      return { rowCount: 1 };
    });
    await SessionModel.update("s1", { title: "x" });
    assert.doesNotMatch(calls[0].sql, /reminder_sent_at|closed_at/);
    assert.equal(await SessionModel.update("s1", { reset_deadline: true }), false);
    assert.equal(calls.length, 1);
  });
});

describe("toPublicSession.closedAt", () => {
  test("closed_at (Date hoặc chuỗi) → ISO; không có → null; status closed được giữ nguyên", () => {
    const at = new Date("2026-11-15T17:00:00Z");
    assert.equal(toPublicSession({ id: "s", status: "closed", closed_at: at }).closedAt, "2026-11-15T17:00:00.000Z");
    assert.equal(toPublicSession({ id: "s", status: "closed", closed_at: "2026-11-15T17:00:00Z" }).closedAt, "2026-11-15T17:00:00.000Z");
    assert.equal(toPublicSession({ id: "s", status: "active_poll" }).closedAt, null);
    assert.equal(toPublicSession({ id: "s", status: "closed" }).status, "closed");
    assert.equal(toPublicSession(null), null);
  });
});
