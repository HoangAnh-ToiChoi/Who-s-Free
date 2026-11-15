import test from "node:test";
import assert from "node:assert/strict";
import NotificationModel from "../../src/models/notification.model.js";
import notificationService from "../../src/services/notification.service.js";

const user = { id: "u1", email: "a@x.com" };
const realFindReminders = NotificationModel.findReminders;
const realFindRecentClosed = NotificationModel.findRecentClosed;

function stub({ seenAt = null, invitations = [], finalized = [], reminders = [], closed = [] } = {}) {
  NotificationModel.getSeenAt = async () => seenAt;
  NotificationModel.findPendingInvitations = async () => invitations;
  NotificationModel.findRecentFinalized = async () => finalized;
  NotificationModel.findReminders = async () => reminders;
  NotificationModel.findRecentClosed = async () => closed;
}

async function withMutedErrors(fn) {
  const logged = [];
  const original = console.error;
  console.error = (...args) => logged.push(args.join(" "));
  try {
    await fn();
  } finally {
    console.error = original;
  }
  return logged;
}

test("reminder + closed: đúng shape theo contract, link tới ma trận, unread theo mốc đã xem", async () => {
  stub({
    seenAt: "2026-11-15T13:30:00Z",
    reminders: [
      { id: "s1", slug: "plan", title: "Plan", group_id: "g1", group_name: "G1", reminder_sent_at: "2026-11-15T13:00:00Z", end_date: "2026-11-16" },
    ],
    closed: [{ id: "s2", slug: "trip", title: "Trip", group_id: "g2", group_name: "G2", closed_at: "2026-11-15T17:00:00Z" }],
  });

  const { items, unreadCount } = await notificationService.list(user);

  assert.deepEqual(items.map((i) => i.id), ["closed:s2", "reminder:s1"]);
  assert.deepEqual(items[0], {
    id: "closed:s2",
    type: "closed",
    createdAt: "2026-11-15T17:00:00Z",
    groupName: "G2",
    sessionTitle: "Trip",
    link: "/groups/g2/matrix/trip",
    unread: true,
  });
  assert.deepEqual(items[1], {
    id: "reminder:s1",
    type: "reminder",
    createdAt: "2026-11-15T13:00:00Z",
    groupName: "G1",
    sessionTitle: "Plan",
    endDate: "2026-11-16",
    link: "/groups/g1/matrix/plan",
    unread: false,
  });
  assert.equal(unreadCount, 1);
});

test("một nhóm query lỗi: log có tên query và vẫn trả các nhóm còn lại", async () => {
  stub({ finalized: [{ id: "s1", slug: "p", title: "P", group_id: "g", group_name: "G", finalized_at: "2026-11-15T10:00:00Z" }] });
  NotificationModel.findPendingInvitations = async () => {
    throw new Error('relation "public.group_invitations" does not exist');
  };
  let ids;
  const logged = await withMutedErrors(async () => {
    ids = (await notificationService.list(user)).items.map((i) => i.id);
  });
  assert.deepEqual(ids, ["finalized:s1"]);
  assert.equal(logged.length, 1);
  assert.match(logged[0], /pendingInvitations/);
  assert.match(logged[0], /group_invitations/);
});

test("query reminders/closed lỗi không làm mất lời mời", async () => {
  stub({ invitations: [{ id: "i1", created_at: "2026-11-15T09:00:00Z", group_name: "G" }] });
  NotificationModel.findReminders = async () => {
    throw new Error("column reminder_sent_at does not exist");
  };
  NotificationModel.findRecentClosed = async () => {
    throw new Error("column closed_at does not exist");
  };
  let ids;
  const logged = await withMutedErrors(async () => {
    ids = (await notificationService.list(user)).items.map((i) => i.id);
  });
  assert.deepEqual(ids, ["invite:i1"]);
  assert.equal(logged.length, 2);
});

test("lấy mốc đã xem lỗi: vẫn trả thông báo (coi như chưa xem)", async () => {
  stub({ invitations: [{ id: "i1", created_at: "2026-11-15T09:00:00Z", group_name: "G" }] });
  NotificationModel.getSeenAt = async () => {
    throw new Error("users table down");
  };
  let result;
  await withMutedErrors(async () => {
    result = await notificationService.list(user);
  });
  assert.equal(result.items.length, 1);
  assert.equal(result.unreadCount, 1);
});

test("TẤT CẢ nguồn thông báo lỗi (DB chết): ném lỗi để FE biết, không giả vờ rỗng", async () => {
  const boom = async () => {
    throw new Error("db down");
  };
  NotificationModel.getSeenAt = boom;
  NotificationModel.findPendingInvitations = boom;
  NotificationModel.findRecentFinalized = boom;
  NotificationModel.findReminders = boom;
  NotificationModel.findRecentClosed = boom;
  await withMutedErrors(async () => {
    await assert.rejects(notificationService.list(user), /Không tải được thông báo/);
  });
});

test("không có reminder/closed: shape bao ngoài giữ nguyên { items, unreadCount }", async () => {
  stub();
  assert.deepEqual(await notificationService.list(user), { items: [], unreadCount: 0 });
});

test("giới hạn 30 item sau khi trộn nhiều nguồn", async () => {
  const many = (prefix, n) =>
    Array.from({ length: n }, (_, i) => ({
      id: `${prefix}${i}`,
      slug: "s",
      title: "T",
      group_id: "g",
      group_name: "G",
      closed_at: `2026-11-15T10:${String(i).padStart(2, "0")}:00Z`,
      reminder_sent_at: `2026-11-14T10:${String(i).padStart(2, "0")}:00Z`,
    }));
  stub({ reminders: many("r", 30), closed: many("c", 30) });
  assert.equal((await notificationService.list(user)).items.length, 30);
});

test("model: query reminder/closed chỉ cho owner/lead, không SELECT *, có LIMIT", async () => {
  const { pool } = await import("../../src/configs/db.config.js");
  const original = pool.query;
  const sqls = [];
  pool.query = async (sql) => {
    sqls.push(sql);
    return { rows: [] };
  };
  try {
    await realFindReminders.call(NotificationModel, "u1");
    await realFindRecentClosed.call(NotificationModel, "u1");
  } finally {
    pool.query = original;
    await pool.end();
  }
  assert.equal(sqls.length, 2);
  for (const sql of sqls) {
    assert.match(sql, /gm\.role IN \('owner', 'lead'\)/);
    assert.match(sql, /LIMIT 30/);
    assert.doesNotMatch(sql, /SELECT\s+\*/i);
  }
  assert.match(sqls[0], /reminder_sent_at IS NOT NULL/);
  assert.match(sqls[0], /AT TIME ZONE 'Asia\/Ho_Chi_Minh'/);
  assert.match(sqls[1], /INTERVAL '14 days'/);
});
