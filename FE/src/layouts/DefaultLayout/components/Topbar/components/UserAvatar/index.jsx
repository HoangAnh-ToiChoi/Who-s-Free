import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { LogOut, Settings, User, Globe } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { useClickOutside } from "~/hooks";

function UserAvatar({ user }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useClickOutside(ref, () => setOpen(false));

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  const isVietnamese = i18n.language?.startsWith("vi");

  const handleToggleLanguage = (lang) => {
    i18n.changeLanguage(lang);
  };

  return (
    <div ref={ref} className="relative shrink-0">
      {/* Avatar trigger */}
      <button
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "h-9 w-9 overflow-hidden rounded-full ring-2 transition-all focus:outline-none cursor-pointer",
          open ? "ring-indigo-600" : "ring-slate-200 hover:ring-slate-300"
        )}
      >
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-indigo-600 text-xs font-bold text-white">
            {initials}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* User info */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            <div className="h-9 w-9 overflow-hidden rounded-full shrink-0">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-indigo-600 text-xs font-bold text-white">
                  {initials}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">
                {user?.name}
              </div>
              <div className="truncate text-xs text-slate-500">
                {user?.email}
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-1">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-9 font-normal text-slate-700 cursor-pointer"
            >
              <User size={15} className="text-slate-400" />
              <span>{t("topbar.profile")}</span>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-9 font-normal text-slate-700 cursor-pointer"
            >
              <Settings size={15} className="text-slate-400" />
              <span>{t("topbar.settings")}</span>
            </Button>
          </div>

          {/* Language Switcher Row */}
          <div className="border-t border-slate-100 px-3 py-2 flex items-center justify-between text-xs text-slate-700">
            <div className="flex items-center gap-2.5">
              <Globe size={15} className="text-slate-400 shrink-0" />
              <span className="font-medium">{t("common.language")}</span>
            </div>

            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100/70 p-0.5 select-none">
              <button
                type="button"
                onClick={() => handleToggleLanguage("en")}
                className={cn(
                  "px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer text-[11px]",
                  !isVietnamese
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleToggleLanguage("vi")}
                className={cn(
                  "px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer text-[11px]",
                  isVietnamese
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                VI
              </button>
            </div>
          </div>

          {/* Sign out */}
          <div className="border-t border-slate-100 p-1">
            <Button
              variant="destructive"
              className="w-full justify-start gap-3 h-9 font-normal cursor-pointer"
            >
              <LogOut size={15} />
              <span>{t("topbar.signOut")}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserAvatar;
