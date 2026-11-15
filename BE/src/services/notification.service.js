import NotificationModel from "../models/notification.model.js";

const matrixLink = (row) => `/groups/${row.group_id}/matrix/${row.slug}`;

/**
 * Chạy một nhóm query; lỗi thì ghi log (có tên query) và trả null để các nhóm còn lại vẫn hiện
 * (bài học từ lỗi thiếu bảng group_invitations làm sập cả chuông).
 */
async function settle(name, run) {
  try {
    return await run();
  } catch (error) {
    console.error(`[notifications] query "${name}" lỗi:`, error.message);
    return null;
  }
}

/** Gộp lời mời + lịch đã chốt + nhắc hạn + đã đóng thành một danh sách thông báo, mới nhất trước. */
class NotificationService {
  async list(user) {
    const [seenAt, invitations, finalized, reminders, closed] = await Promise.all([
      settle("seenAt", () => NotificationModel.getSeenAt(user.id)),
      settle("pendingInvitations", () => NotificationModel.findPendingInvitations(user.email)),
      settle("recentFinalized", () => NotificationModel.findRecentFinalized(user.id)),
      settle("reminders", () => NotificationModel.findReminders(user.id)),
      settle("recentClosed", () => NotificationModel.findRecentClosed(user.id)),
    ]);

    // Toàn bộ nguồn thông báo lỗi thì báo lỗi thật (để FE hiện dấu hiệu) thay vì giả vờ "không có thông báo"
    if ([invitations, finalized, reminders, closed].every((group) => group === null)) {
      throw new Error("Không tải được thông báo");
    }

    const seenTime = seenAt ? new Date(seenAt).getTime() : 0;
    const toItem = (item) => ({
      ...item,
      unread: new Date(item.createdAt).getTime() > seenTime,
    });

    const items = [
      ...(invitations ?? []).map((row) =>
        toItem({
          id: `invite:${row.id}`,
          type: "invite",
          createdAt: row.created_at,
          groupName: row.group_name,
          actorName: row.inviter_name || null,
          link: null,
        }),
      ),
      ...(finalized ?? []).map((row) =>
        toItem({
          id: `finalized:${row.id}`,
          type: "finalized",
          createdAt: row.finalized_at,
          groupName: row.group_name,
          sessionTitle: row.title,
          link: matrixLink(row),
        }),
      ),
      ...(reminders ?? []).map((row) =>
        toItem({
          id: `reminder:${row.id}`,
          type: "reminder",
          createdAt: row.reminder_sent_at,
          groupName: row.group_name,
          sessionTitle: row.title,
          endDate: row.end_date,
          link: matrixLink(row),
        }),
      ),
      ...(closed ?? []).map((row) =>
        toItem({
          id: `closed:${row.id}`,
          type: "closed",
          createdAt: row.closed_at,
          groupName: row.group_name,
          sessionTitle: row.title,
          link: matrixLink(row),
        }),
      ),
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 30);

    return { items, unreadCount: items.filter((i) => i.unread).length };
  }

  async markAllRead(userId) {
    await NotificationModel.markSeen(userId);
    return { unreadCount: 0 };
  }
}

export default new NotificationService();
