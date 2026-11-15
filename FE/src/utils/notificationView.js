// Ánh xạ item thông báo của BE → key i18n + kiểu hiển thị. Module thuần để test.
const VIEWS = {
  invite: {
    icon: "UserPlus",
    tone: "bg-indigo-100 text-indigo-600",
    textKey: "notifications.invite",
    hintKey: "notifications.inviteHint",
    params: (item) => ({ group: item.groupName }),
  },
  finalized: {
    icon: "CalendarCheck",
    tone: "bg-emerald-100 text-emerald-600",
    textKey: "notifications.finalized",
    params: (item) => ({ session: item.sessionTitle, group: item.groupName }),
  },
  reminder: {
    icon: "AlarmClock",
    tone: "bg-amber-100 text-amber-600",
    textKey: "notifications.reminder",
    params: (item) => ({ title: item.sessionTitle, group: item.groupName }),
  },
  closed: {
    icon: "CalendarX",
    tone: "bg-orange-100 text-orange-600",
    textKey: "notifications.closed",
    params: (item) => ({ title: item.sessionTitle, group: item.groupName }),
  },
};

/** @returns {{ icon: string, tone: string, textKey: string, hintKey?: string, params: object } | null} null nếu type lạ. */
export function getNotificationView(item) {
  const view = VIEWS[item?.type];
  if (!view) return null;
  const { params, ...rest } = view;
  return { ...rest, params: params(item) };
}
