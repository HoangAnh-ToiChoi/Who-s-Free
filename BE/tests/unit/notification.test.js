import test from "node:test";
import assert from "node:assert/strict";
import NotificationModel from "../../src/models/notification.model.js";
import notificationService from "../../src/services/notification.service.js";

const user = { id: "u1", email: "a@x.com" };

function stub({ seenAt, invitations = [], finalized = [] }) {
  NotificationModel.getSeenAt = async () => seenAt;
  NotificationModel.findPendingInvitations = async () => invitations;
  NotificationModel.findRecentFinalized = async () => finalized;
}

test("trộn lời mời + lịch chốt, mới nhất trước, đếm chưa đọc theo mốc đã xem", async () => {
  stub({
    seenAt: "2026-10-24T10:00:00Z",
    invitations: [{ id: "i1", created_at: "2026-10-24T09:00:00Z", group_name: "G1", inviter_name: "Lan" }],
    finalized: [
      { id: "s1", slug: "plan", title: "Plan", group_id: "g2", group_name: "G2", finalized_at: "2026-10-24T11:00:00Z" },
    ],
  });

  const { items, unreadCount } = await notificationService.list(user);

  assert.deepEqual(items.map((i) => i.id), ["finalized:s1", "invite:i1"]);
  assert.equal(items[0].unread, true);
  assert.equal(items[1].unread, false);
  assert.equal(items[0].link, "/groups/g2/matrix/plan");
  assert.equal(items[1].link, null);
  assert.equal(unreadCount, 1);
});

test("chưa từng xem (seenAt null) thì tất cả là chưa đọc; không có gì thì 0", async () => {
  stub({ seenAt: null, invitations: [{ id: "i1", created_at: "2026-10-24T09:00:00Z", group_name: "G" }] });
  assert.equal((await notificationService.list(user)).unreadCount, 1);

  stub({ seenAt: null });
  assert.deepEqual(await notificationService.list(user), { items: [], unreadCount: 0 });
});
