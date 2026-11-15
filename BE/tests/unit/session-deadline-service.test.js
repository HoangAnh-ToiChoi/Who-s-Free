import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";

process.env.SUPABASE_URL ||= "http://127.0.0.1:9";
process.env.SUPABASE_ANON_KEY ||= "test-anon-key";

const { default: Model } = await import("../../src/models/session-deadline.model.js");
const { default: EmailDeadlineService } = await import("../../src/services/email-deadline.service.js");
const { default: service } = await import("../../src/services/session-deadline.service.js");
const { pool } = await import("../../src/configs/db.config.js");

const originals = [];
const stub = (target, name, fn) => {
  originals.push([target, name, target[name]]);
  target[name] = fn;
};
afterEach(() => {
  while (originals.length) {
    const [target, name, fn] = originals.pop();
    target[name] = fn;
  }
});

const sess = (id, groupId = "g1") => ({ id, group_id: groupId, slug: `slug-${id}`, title: `T ${id}`, end_date: "2026-11-16", group_name: "Nhóm" });

/** Model giả có trạng thái: claim chỉ trả session MỘT lần (mô phỏng UPDATE ... RETURNING nguyên tử), release trả lại hàng đợi. */
function fakeModel({ closedQueue = [], reminderQueue = [], leads = { g1: ["o@x.com", "l@x.com"] } } = {}) {
  const state = { runs: [], released: { closed: [], reminder: [] }, nowSeen: [], closeCalls: 0 };
  stub(Model, "startRun", async () => "run-1");
  stub(Model, "finishRun", async (id, stats) => state.runs.push({ id, ...stats }));
  stub(Model, "closeOverdue", async (now) => {
    state.nowSeen.push(now);
    state.closeCalls += 1;
    return closedQueue.length;
  });
  stub(Model, "claimClosedNotifications", async (now) => {
    state.nowSeen.push(now);
    return closedQueue.splice(0);
  });
  stub(Model, "claimReminders", async (now) => {
    state.nowSeen.push(now);
    return reminderQueue.splice(0);
  });
  stub(Model, "releaseClosedNotifications", async (ids) => {
    state.released.closed.push(...ids);
    closedQueue.push(...ids.map((id) => sess(id)));
  });
  stub(Model, "releaseReminders", async (ids) => {
    state.released.reminder.push(...ids);
    reminderQueue.push(...ids.map((id) => sess(id)));
  });
  stub(Model, "findLeadEmailsByGroup", async () => new Map(Object.entries(leads)));
  return state;
}

function fakeEmail({ failClosed = false, failReminder = false, partialReminder = false } = {}) {
  const sent = { closed: [], reminder: [] };
  stub(EmailDeadlineService, "sendSessionClosed", async (args) => {
    if (failClosed) throw new Error("provider down");
    sent.closed.push(args);
    return { total: args.emails.length, sent: args.emails.length, failed: 0 };
  });
  stub(EmailDeadlineService, "sendDeadlineReminder", async (args) => {
    if (failReminder) throw new Error("provider down");
    sent.reminder.push(args);
    if (partialReminder) return { total: args.emails.length, sent: 1, failed: args.emails.length - 1 };
    return { total: args.emails.length, sent: args.emails.length, failed: 0 };
  });
  return sent;
}

const NOW = new Date("2026-11-15T13:00:00Z");

describe("SessionDeadlineService.run", () => {
  test("happy path: đóng + mail đã đóng + mail nhắc tới owner/lead, ghi job_runs, trả đúng số", async () => {
    const state = fakeModel({ closedQueue: [sess("c1")], reminderQueue: [sess("r1")] });
    const sent = fakeEmail();

    const result = await service.run(NOW);

    assert.deepEqual(result, { runId: "run-1", remindersSent: 1, sessionsClosed: 1, emailsFailed: 0 });
    assert.deepEqual(sent.closed[0].emails, ["o@x.com", "l@x.com"]);
    assert.equal(sent.closed[0].sessionTitle, "T c1");
    assert.equal(sent.closed[0].groupName, "Nhóm");
    assert.match(sent.closed[0].sessionUrl, /\/groups\/g1\/matrix\/slug-c1$/);
    assert.equal(sent.reminder[0].endDate, "2026-11-16");
    assert.equal(state.runs.length, 1);
    assert.equal(state.runs[0].error, undefined);
    assert.equal(state.runs[0].sessionsClosed, 1);
  });

  test("dùng cùng một mốc now cho cả ba bước (không lệch múi giờ giữa các bước)", async () => {
    const state = fakeModel();
    fakeEmail();
    await service.run(NOW);
    assert.equal(state.nowSeen.length, 3);
    assert.ok(state.nowSeen.every((d) => d === NOW));
  });

  test("idempotent: gọi lần 2 liên tiếp không gửi mail trùng", async () => {
    fakeModel({ closedQueue: [sess("c1")], reminderQueue: [sess("r1")] });
    const sent = fakeEmail();

    await service.run(NOW);
    const second = await service.run(NOW);

    assert.equal(sent.closed.length, 1);
    assert.equal(sent.reminder.length, 1);
    assert.equal(second.remindersSent, 0);
    assert.equal(second.emailsFailed, 0);
  });

  test("gửi mail đóng thất bại: trả closed_notified_at về NULL, tính emailsFailed, lần sau gửi lại được", async () => {
    const state = fakeModel({ closedQueue: [sess("c1")] });
    fakeEmail({ failClosed: true });

    const first = await service.run(NOW);
    assert.deepEqual(state.released.closed, ["c1"]);
    assert.equal(first.emailsFailed, 2);

    stub(EmailDeadlineService, "sendSessionClosed", async (args) => ({ total: args.emails.length, sent: args.emails.length, failed: 0 }));
    const second = await service.run(NOW);
    assert.equal(second.emailsFailed, 0);
    assert.equal(state.released.closed.length, 1, "lần 2 gửi được nên không release nữa");
  });

  test("gửi mail nhắc thất bại: reset reminder_sent_at, không tính vào remindersSent", async () => {
    const state = fakeModel({ reminderQueue: [sess("r1")] });
    fakeEmail({ failReminder: true });
    const result = await service.run(NOW);
    assert.deepEqual(state.released.reminder, ["r1"]);
    assert.equal(result.remindersSent, 0);
    assert.equal(result.emailsFailed, 2);
  });

  test("gửi lỗi một phần: giữ dấu (tránh gửi trùng người đã nhận) nhưng vẫn tính emailsFailed", async () => {
    const state = fakeModel({ reminderQueue: [sess("r1")] });
    fakeEmail({ partialReminder: true });
    const result = await service.run(NOW);
    assert.deepEqual(state.released.reminder, []);
    assert.equal(result.remindersSent, 1);
    assert.equal(result.emailsFailed, 1);
  });

  test("nhóm không có owner/lead nào có email: không gửi, không release, không tính lỗi", async () => {
    const state = fakeModel({ reminderQueue: [sess("r1")], leads: {} });
    const sent = fakeEmail();
    const result = await service.run(NOW);
    assert.equal(sent.reminder.length, 0);
    assert.deepEqual(state.released.reminder, []);
    assert.equal(result.emailsFailed, 0);
  });

  test("nhiều session cùng nhóm: mỗi session một batch, người nhận chỉ tra bằng một query", async () => {
    fakeModel({ reminderQueue: [sess("r1"), sess("r2")] });
    const sent = fakeEmail();
    let lookups = 0;
    stub(Model, "findLeadEmailsByGroup", async () => {
      lookups += 1;
      return new Map([["g1", ["o@x.com"]]]);
    });
    const result = await service.run(NOW);
    assert.equal(sent.reminder.length, 2);
    assert.equal(lookups, 1);
    assert.equal(result.remindersSent, 2);
  });

  test("tra người nhận lỗi: trả dấu về NULL cho cả lô đã giành, ném lỗi và ghi error vào job_runs", async () => {
    const state = fakeModel({ closedQueue: [sess("c1")] });
    fakeEmail();
    stub(Model, "findLeadEmailsByGroup", async () => {
      throw new Error("db down");
    });
    await assert.rejects(service.run(NOW), /db down/);
    assert.deepEqual(state.released.closed, ["c1"]);
    assert.match(state.runs[0].error, /db down/);
  });

  test("DB lỗi ở bước đóng: ném lỗi, vẫn ghi job_runs có error, không gửi mail", async () => {
    const state = fakeModel();
    const sent = fakeEmail();
    stub(Model, "closeOverdue", async () => {
      throw new Error("statement timeout");
    });
    await assert.rejects(service.run(NOW), /statement timeout/);
    assert.equal(state.runs.length, 1);
    assert.match(state.runs[0].error, /statement timeout/);
    assert.equal(sent.closed.length + sent.reminder.length, 0);
  });

  test("không ghi được job_runs khi đang lỗi: vẫn ném lỗi gốc", async () => {
    fakeModel();
    stub(Model, "closeOverdue", async () => {
      throw new Error("root cause");
    });
    stub(Model, "finishRun", async () => {
      throw new Error("job_runs down");
    });
    const origError = console.error;
    console.error = () => {};
    try {
      await assert.rejects(service.run(NOW), /root cause/);
    } finally {
      console.error = origError;
    }
  });

  test("không startRun được (DB chết): ném lỗi", async () => {
    stub(Model, "startRun", async () => {
      throw new Error("ECONNREFUSED");
    });
    await assert.rejects(service.run(NOW), /ECONNREFUSED/);
  });
});

describe("EmailDeadlineService (NODE_ENV=test không gọi mạng)", () => {
  let savedEnv;
  beforeEach(() => {
    savedEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";
    stub(globalThis, "fetch", async () => assert.fail("không được gọi mạng"));
  });
  afterEach(() => {
    process.env.NODE_ENV = savedEnv;
  });

  test("sendDeadlineReminder / sendSessionClosed trả { total, sent, failed } tại chỗ", async () => {
    const args = { emails: ["a@x.com", "b@x.com"], groupName: "<G>", sessionTitle: "T", endDate: "2026-11-16", sessionUrl: "http://x/y" };
    assert.deepEqual(await EmailDeadlineService.sendDeadlineReminder(args), { total: 2, sent: 2, failed: 0 });
    assert.deepEqual(await EmailDeadlineService.sendSessionClosed(args), { total: 2, sent: 2, failed: 0 });
  });

  test("ngoài môi trường test mà chưa cấu hình email: ném 503 EMAIL_NOT_CONFIGURED", async () => {
    process.env.NODE_ENV = "development";
    const keys = ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "EMAIL_PROVIDER"];
    const saved = keys.map((k) => [k, process.env[k]]);
    keys.forEach((k) => delete process.env[k]);
    try {
      await assert.rejects(
        EmailDeadlineService.sendSessionClosed({ emails: ["a@x.com"], groupName: "G", sessionTitle: "T", sessionUrl: "http://x" }),
        { statusCode: 503, errorCode: "EMAIL_NOT_CONFIGURED" },
      );
    } finally {
      saved.forEach(([k, v]) => (v === undefined ? delete process.env[k] : (process.env[k] = v)));
    }
  });
});

test("đóng pool sau khi xong", async () => {
  await pool.end();
});
