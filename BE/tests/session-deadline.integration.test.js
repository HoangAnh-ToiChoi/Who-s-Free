import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

// Cần DB đã chạy DB/migrations/20261115_session_deadline_reminder.sql. Không có DATABASE_URL thì bỏ qua.
// An toàn với DB dùng chung: `now` giả đặt ở năm 2001 nên các UPDATE chỉ chạm các session test (end_date năm 2001).
process.env.SUPABASE_URL ||= "http://127.0.0.1:9";
process.env.SUPABASE_ANON_KEY ||= "test-anon-key";
const skip = process.env.DATABASE_URL ? false : "cần DATABASE_URL (Postgres đã áp migration 20261115)";

let query, pool, Model, S;
const ids = { group: null, owner: null, lead: null, member: null };
const at = (iso) => new Date(iso);

before(async () => {
  if (skip) return;
  ({ query, pool } = await import("../src/configs/db.config.js"));
  ({ default: Model } = await import("../src/models/session-deadline.model.js"));
  ({ default: S } = await import("../src/models/session.model.js"));
  const tag = Date.now();
  const user = async (label) =>
    (await query("INSERT INTO public.users (email, full_name) VALUES ($1, $2) RETURNING id;", [`dl-${label}-${tag}@example.com`, label])).rows[0].id;
  ids.owner = await user("owner");
  ids.lead = await user("lead");
  ids.member = await user("member");
  ids.group = (await query("INSERT INTO public.groups (slug, name) VALUES ($1, 'Deadline test') RETURNING id;", [`dl-test-${tag}`])).rows[0].id;
  await query(
    "INSERT INTO public.group_members (group_id, user_id, role) VALUES ($1,$2,'owner'),($1,$3,'lead'),($1,$4,'member');",
    [ids.group, ids.owner, ids.lead, ids.member],
  );
});

after(async () => {
  if (skip) return;
  await query("DELETE FROM public.groups WHERE id = $1;", [ids.group]);
  await query("DELETE FROM public.users WHERE id = ANY($1::uuid[]);", [[ids.owner, ids.lead, ids.member]]);
  await pool.end();
});

const mk = async (endDate, createdAt = "2001-03-01T00:00:00Z") =>
  (
    await query(
      `INSERT INTO public.sessions (group_id, slug, title, start_date, end_date, created_at)
       VALUES ($1, $2, 'T', '2001-01-01', $3, $4) RETURNING id;`,
      [ids.group, `dl-${Math.random()}`, endDate, createdAt],
    )
  ).rows[0].id;
const clear = () => query("DELETE FROM public.sessions WHERE group_id = $1;", [ids.group]);
const status = async (id) => (await query("SELECT status, closed_at, closed_notified_at, reminder_sent_at FROM public.sessions WHERE id = $1;", [id])).rows[0];
// Chỉ đếm session của nhóm test (UPDATE toàn bảng nhưng now ở năm 2001 nên không dính dữ liệu thật)
const mine = (rows) => rows.filter((r) => r.group_id === ids.group);

describe("nhắc 20h giờ VN (UTC+7), end_date = 2001-03-11", { skip }, () => {
  test("19:59 chưa nhắc; 20:00 nhắc; gọi lại không nhắc trùng", async () => {
    await clear();
    await mk("2001-03-11");
    assert.equal(mine(await Model.claimReminders(at("2001-03-10T12:59:00Z"))).length, 0);
    assert.equal(mine(await Model.claimReminders(at("2001-03-10T13:00:00Z"))).length, 1);
    assert.equal(mine(await Model.claimReminders(at("2001-03-10T13:00:01Z"))).length, 0);
  });

  test("01:00 VN ngày 11 (18:00Z ngày 10, còn là ngày 10 theo UTC) thì end_date 11 là HÔM NAY, không phải ngày mai", async () => {
    await clear();
    await mk("2001-03-11");
    assert.equal(mine(await Model.claimReminders(at("2001-03-10T18:00:00Z"))).length, 0);
  });

  test("session tạo sau 20:00 VN hôm nay không bị nhắc ngay; tạo 19:59 thì có", async () => {
    await clear();
    await mk("2001-03-11", "2001-03-10T13:30:00Z");
    assert.equal(mine(await Model.claimReminders(at("2001-03-10T14:00:00Z"))).length, 0);
    await clear();
    await mk("2001-03-11", "2001-03-10T12:59:00Z");
    assert.equal(mine(await Model.claimReminders(at("2001-03-10T14:00:00Z"))).length, 1);
  });

  test("gửi lỗi thì release → lần sau nhắc lại được", async () => {
    await clear();
    const id = await mk("2001-03-11");
    await Model.claimReminders(at("2001-03-10T13:00:00Z"));
    await Model.releaseReminders([id]);
    assert.equal((await status(id)).reminder_sent_at, null);
    assert.equal(mine(await Model.claimReminders(at("2001-03-10T13:10:00Z"))).length, 1);
  });
});

describe("tự đóng giờ VN, end_date = 2001-03-10", { skip }, () => {
  test("23:59 VN chưa đóng; 00:00 VN ngày sau đóng; lần 2 không đóng lại", async () => {
    await clear();
    const id = await mk("2001-03-10");
    await Model.closeOverdue(at("2001-03-10T16:59:00Z"));
    assert.equal((await status(id)).status, "active_poll");
    await Model.closeOverdue(at("2001-03-10T17:00:00Z"));
    const closed = await status(id);
    assert.equal(closed.status, "closed");
    assert.ok(closed.closed_at);
  });

  test("mail đã đóng: giành quyền đúng một lần, release thì giành lại được; session đã chốt không bị đóng", async () => {
    await clear();
    const id = await mk("2001-03-10");
    const fin = await mk("2001-03-01");
    await query("UPDATE public.sessions SET status = 'finalized' WHERE id = $1;", [fin]);
    await Model.closeOverdue(at("2001-03-10T17:00:00Z"));
    assert.equal((await status(fin)).status, "finalized");
    const first = mine(await Model.claimClosedNotifications(at("2001-03-10T17:01:00Z")));
    assert.equal(first.length, 1);
    assert.equal(first[0].group_name, "Deadline test");
    assert.equal(mine(await Model.claimClosedNotifications(at("2001-03-10T17:02:00Z"))).length, 0);
    await Model.releaseClosedNotifications([id]);
    assert.equal(mine(await Model.claimClosedNotifications(at("2001-03-10T17:03:00Z"))).length, 1);
  });

  test("người nhận chỉ là owner + lead", async () => {
    const emails = (await Model.findLeadEmailsByGroup([ids.group])).get(ids.group);
    assert.equal(emails.length, 2);
    assert.ok(emails.every((e) => /dl-(owner|lead)-/.test(e)));
  });
});

describe("gia hạn mở lại session closed", { skip }, () => {
  test("end_date mới >= hôm nay (VN) mở lại + reset dấu; end_date mới vẫn ở quá khứ thì giữ closed nhưng vẫn reset nhắc", async () => {
    await clear();
    const id = await mk("2001-03-10");
    await query("UPDATE public.sessions SET status='closed', closed_at=NOW(), closed_notified_at=NOW(), reminder_sent_at=NOW() WHERE id=$1;", [id]);
    await S.update(id, { start_date: "2001-01-01", end_date: "2001-03-12", reset_deadline: true });
    const stillClosed = await status(id);
    assert.equal(stillClosed.status, "closed");
    assert.equal(stillClosed.reminder_sent_at, null);

    const today = (await query("SELECT ((NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)::text AS d;")).rows[0].d;
    await S.update(id, { start_date: "2001-01-01", end_date: today, reset_deadline: true });
    const reopened = await status(id);
    assert.deepEqual({ ...reopened, reminder_sent_at: null }, { status: "active_poll", closed_at: null, closed_notified_at: null, reminder_sent_at: null });
  });
});

describe("job_runs", { skip }, () => {
  test("startRun + finishRun ghi một dòng với số liệu và error", async () => {
    const runId = await Model.startRun();
    await Model.finishRun(runId, { remindersSent: 1, sessionsClosed: 2, emailsFailed: 3, error: "x" });
    const row = (await query("SELECT * FROM public.job_runs WHERE id = $1;", [runId])).rows[0];
    assert.deepEqual([row.reminders_sent, row.sessions_closed, row.emails_failed, row.error], [1, 2, 3, "x"]);
    assert.ok(row.finished_at);
    await query("DELETE FROM public.job_runs WHERE id = $1;", [runId]);
  });
});
