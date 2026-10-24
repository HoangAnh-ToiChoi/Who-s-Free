import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Bell, CalendarCheck, UserPlus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useClickOutside } from "~/hooks";

const TYPE_STYLES = {
  invite: { Icon: UserPlus, className: "bg-indigo-100 text-indigo-600" },
  finalized: { Icon: CalendarCheck, className: "bg-emerald-100 text-emerald-600" },
};

const RELATIVE_STEPS = [
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

/** "5 phút trước" / "5 minutes ago" theo ngôn ngữ đang dùng. */
function formatRelative(dateString, locale) {
  const diffSeconds = Math.round((new Date(dateString).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, seconds] of RELATIVE_STEPS) {
    if (Math.abs(diffSeconds) >= seconds) return rtf.format(Math.round(diffSeconds / seconds), unit);
  }
  return rtf.format(0, "minute");
}

function NotificationBell({ items = [], unreadCount = 0, onOpen }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useClickOutside(ref, () => setOpen(false));

  const toggle = () => {
    if (!open) onOpen?.();
    setOpen(!open);
  };

  const describe = (item) =>
    item.type === "invite"
      ? t("notifications.invite", { group: item.groupName })
      : t("notifications.finalized", { session: item.sessionTitle, group: item.groupName });

  const handleItemClick = (item) => {
    if (!item.link) return;
    setOpen(false);
    navigate(item.link);
  };

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon-lg"
        onClick={toggle}
        aria-label={t("notifications.title")}
        aria-expanded={open}
        className="relative cursor-pointer rounded-xl text-slate-600 hover:text-slate-900"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="bg-primary text-primary-foreground absolute top-1 right-1 flex h-4 min-w-4 animate-in zoom-in-50 items-center justify-center rounded-full px-1 text-[10px] leading-none font-bold ring-2 ring-white duration-150">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute top-full right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] origin-top-right animate-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg duration-150 fade-in-0 zoom-in-95">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
            {t("notifications.title")}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-slate-400">{t("notifications.empty")}</p>
          ) : (
            <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
              {items.map((item) => {
                const { Icon, className } = TYPE_STYLES[item.type] || TYPE_STYLES.invite;
                const clickable = Boolean(item.link);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleItemClick(item)}
                      disabled={!clickable}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                        item.unread ? "bg-indigo-50/50" : ""
                      } ${clickable ? "cursor-pointer hover:bg-slate-50" : "cursor-default"}`}
                    >
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${className}`}
                      >
                        <Icon size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs leading-snug font-medium text-slate-800">
                          {describe(item)}
                        </span>
                        {item.type === "invite" && (
                          <span className="mt-0.5 block text-[11px] text-slate-500">
                            {t("notifications.inviteHint")}
                          </span>
                        )}
                        <span className="mt-0.5 block text-[11px] text-slate-400">
                          {formatRelative(item.createdAt, i18n.language)}
                        </span>
                      </span>
                      {item.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
