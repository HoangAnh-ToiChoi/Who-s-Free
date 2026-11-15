import assert from "node:assert/strict";
import { after, afterEach, before, describe, test } from "node:test";

process.env.SUPABASE_URL ||= "http://127.0.0.1:9";
process.env.SUPABASE_ANON_KEY ||= "test-anon-key";

let pool, Model, originalQuery;

before(async () => {
  ({ pool } = await import("../../src/configs/db.config.js"));
  ({ default: Model } = await import("../../src/models/session-deadline.model.js"));
  originalQuery = pool.query;
});

afterEach(() => {
  pool.query = originalQuery;
});

after(async () => {
  await pool.end();
});

const record = (result) => {
  const calls = [];
  pool.query = async (sql, params) => {
    calls.push({ sql, params });
    return typeof result === "function" ? result(sql, params) : result;
  };
  return calls;
};

const NOW = new Date("2026-11-15T13:00:00Z");

describe("SessionDeadlineModel: giờ VN tính trong SQL", () => {
  test("closeOverdue: chỉ đóng active_poll, so end_date với hôm nay theo Asia/Ho_Chi_Minh, trả số dòng đã đóng", async () => {
    const calls = record({ rowCount: 2, rows: [] });
    assert.equal(await Model.closeOverdue(NOW), 2);
    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /status = 'active_poll' AND end_date < \(\(\$1::timestamptz\) AT TIME ZONE 'Asia\/Ho_Chi_Minh'\)::date/);
    assert.deepEqual(calls[0].params, [NOW]);
  });

  test("claimReminders: điều kiện ngày mai + mốc 20:00 VN + created_at trước mốc + chưa nhắc, giành quyền bằng UPDATE ... RETURNING", async () => {
    const calls = record({ rows: [{ id: "s1", group_id: "g1", slug: "a", title: "T", end_date: "2026-11-16", group_name: "G" }] });
    const rows = await Model.claimReminders(NOW);
    assert.equal(rows.length, 1);
    const { sql } = calls[0];
    assert.match(sql, /UPDATE public\.sessions SET reminder_sent_at = \$1/);
    assert.match(sql, /status = 'active_poll' AND reminder_sent_at IS NULL/);
    assert.match(sql, /end_date = \(\(\$1::timestamptz\) AT TIME ZONE 'Asia\/Ho_Chi_Minh'\)::date \+ 1/);
    assert.match(sql, /TIME '20:00'/);
    assert.match(sql, /\$1::timestamptz >= /);
    assert.match(sql, /created_at < /);
    assert.match(sql, /RETURNING/);
    assert.deepEqual(calls[0].params, [NOW]);
  });

  test("claimClosedNotifications: chỉ session closed chưa báo, giành quyền nguyên tử", async () => {
    const calls = record({ rows: [] });
    assert.deepEqual(await Model.claimClosedNotifications(NOW), []);
    assert.match(calls[0].sql, /SET closed_notified_at = \$1\s+WHERE status = 'closed' AND closed_notified_at IS NULL\s+RETURNING/);
  });

  test("không có SELECT * trong các câu lệnh của job", async () => {
    const calls = record({ rows: [], rowCount: 0 });
    await Model.closeOverdue(NOW);
    await Model.claimClosedNotifications(NOW);
    await Model.claimReminders(NOW);
    await Model.findLeadEmailsByGroup(["g1"]);
    for (const { sql } of calls) assert.doesNotMatch(sql, /SELECT\s+\*/i);
  });
});

describe("SessionDeadlineModel: release / người nhận / job_runs", () => {
  test("release với danh sách rỗng hoặc thiếu: không gọi DB", async () => {
    const calls = record({ rowCount: 0 });
    assert.equal(await Model.releaseReminders([]), 0);
    assert.equal(await Model.releaseClosedNotifications(undefined), 0);
    assert.equal(calls.length, 0);
  });

  test("release: trả cột về NULL theo danh sách id", async () => {
    const calls = record({ rowCount: 2 });
    assert.equal(await Model.releaseReminders(["a", "b"]), 2);
    assert.match(calls[0].sql, /SET reminder_sent_at = NULL WHERE id = ANY/);
    assert.deepEqual(calls[0].params, [["a", "b"]]);
    await Model.releaseClosedNotifications(["a"]);
    assert.match(calls[1].sql, /SET closed_notified_at = NULL WHERE id = ANY/);
  });

  test("findLeadEmailsByGroup: MỘT query cho nhiều nhóm, chỉ owner/lead, gom theo nhóm", async () => {
    const calls = record({
      rows: [
        { group_id: "g1", email: "a@x.com" },
        { group_id: "g1", email: "b@x.com" },
        { group_id: "g2", email: "c@x.com" },
      ],
    });
    const map = await Model.findLeadEmailsByGroup(["g1", "g2"]);
    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /gm\.role IN \('owner', 'lead'\)/);
    assert.deepEqual(map.get("g1"), ["a@x.com", "b@x.com"]);
    assert.deepEqual(map.get("g2"), ["c@x.com"]);
  });

  test("findLeadEmailsByGroup: không có nhóm nào thì không gọi DB", async () => {
    const calls = record({ rows: [] });
    assert.equal((await Model.findLeadEmailsByGroup([])).size, 0);
    assert.equal(calls.length, 0);
  });

  test("startRun trả id; finishRun ghi số liệu và error", async () => {
    const calls = record((sql) => (sql.startsWith("INSERT") ? { rows: [{ id: "run-1" }] } : { rows: [] }));
    assert.equal(await Model.startRun(), "run-1");
    await Model.finishRun("run-1", { remindersSent: 1, sessionsClosed: 2, emailsFailed: 3, error: "boom" });
    assert.deepEqual(calls[1].params, ["run-1", 1, 2, 3, "boom"]);
  });

  test("DB lỗi thì ném lỗi, không nuốt", async () => {
    pool.query = async () => {
      throw new Error("connection refused");
    };
    await assert.rejects(Model.closeOverdue(NOW), /connection refused/);
    await assert.rejects(Model.claimReminders(NOW), /connection refused/);
    await assert.rejects(Model.claimClosedNotifications(NOW), /connection refused/);
    await assert.rejects(Model.startRun(), /connection refused/);
    await assert.rejects(Model.findLeadEmailsByGroup(["g"]), /connection refused/);
  });
});
