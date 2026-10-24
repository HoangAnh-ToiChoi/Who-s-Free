import NotificationModel from "../models/notification.model.js";

/** Gộp lời mời + lịch đã chốt thành một danh sách thông báo, mới nhất trước. */
class NotificationService {
  async list(user) {
    const [seenAt, invitations, finalized] = await Promise.all([
      NotificationModel.getSeenAt(user.id),
      NotificationModel.findPendingInvitations(user.email),
      NotificationModel.findRecentFinalized(user.id),
    ]);

    const seenTime = seenAt ? new Date(seenAt).getTime() : 0;
    const toItem = (item) => ({
      ...item,
      unread: new Date(item.createdAt).getTime() > seenTime,
    });

    const items = [
      ...invitations.map((row) =>
        toItem({
          id: `invite:${row.id}`,
          type: "invite",
          createdAt: row.created_at,
          groupName: row.group_name,
          actorName: row.inviter_name || null,
          link: null,
        }),
      ),
      ...finalized.map((row) =>
        toItem({
          id: `finalized:${row.id}`,
          type: "finalized",
          createdAt: row.finalized_at,
          groupName: row.group_name,
          sessionTitle: row.title,
          link: `/groups/${row.group_id}/matrix/${row.slug}`,
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
