import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Users,
  CalendarPlus,
  UserPlus,
  Bot,
  ArrowLeft,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { useCurrentUser } from "~/hooks";

function HeaderAvatarItem({ member, src }) {
  const [imageError, setImageError] = useState(false);
  const avatarUrl = typeof src === "string" ? src : member?.avatarUrl;
  const name = member?.name || "Thành viên";
  const initial = name.charAt(0).toUpperCase() || "U";
  const hasAvatar = Boolean(avatarUrl) && !imageError;

  if (hasAvatar) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        onError={() => setImageError(true)}
        className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover shrink-0 select-none"
      />
    );
  }

  return (
    <div
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 font-bold text-[10px] text-indigo-700 ring-2 ring-white select-none"
      title={name}
    >
      {initial}
    </div>
  );
}

function GroupHeader({
  group,
  sessionsCount = 0,
  activeTab = "calendars",
  onTabChange,
  onOpenInvite,
  onOpenCreateCalendar,
}) {
  const { t } = useTranslation();
  const { currentUser } = useCurrentUser();

  const currentUserName =
    currentUser?.fullName ||
    currentUser?.name ||
    (currentUser?.email ? currentUser.email.split("@")[0] : "");
  const normalizedUserRole = (group?.userRole || group?.role || "").toLowerCase();
  const canInvite = normalizedUserRole === "owner" || normalizedUserRole === "lead";

  const displayLeadName = group?.leadAdmin || currentUserName || "";

  const previews = Array.isArray(group?.memberPreviews)
    ? group.memberPreviews.slice(0, 4)
    : [];

  const finalLeadName = displayLeadName || previews[0]?.name || "";

  const totalMembers = parseInt(group?.memberCount, 10) || 0;
  const remainingCount = Math.max(0, totalMembers - previews.length);

  const tabs = [
    { id: "calendars", label: t("groupDetail.tabCalendars"), count: sessionsCount, minW: "min-w-[105px]" },
    { id: "members", label: t("groupDetail.tabMembers"), count: group?.memberCount || 0, minW: "min-w-[110px]" },
    { id: "settings", label: t("groupDetail.tabSettings"), minW: "min-w-[85px]" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Back to Home breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-slate-500 hover:text-red-600 font-semibold transition-colors shrink-0 group"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5 group-hover:text-red-600" />
          <span className="hidden sm:inline">{t("common.backToHome")}</span>
        </Link>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        {/* Left: Info */}
        <div className="max-w-3xl">
          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200/70 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-indigo-700 uppercase">
              <Bot size={12} className="text-indigo-600" />
              <span>{group?.name || ""}</span>
            </span>

            <span className="inline-flex min-w-[95px] justify-center items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100/70 px-2 py-0.5 text-[10px] font-semibold text-slate-700 whitespace-nowrap">
              <Users size={12} className="text-slate-500" />
              <span>{t("groupDetail.membersCount", { count: group?.memberCount || 0 })}</span>
            </span>

            {group?.cohort && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100/70 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                <span>{group.cohort}</span>
              </span>
            )}
          </div>

          {/* Group Title */}
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {group?.name || ""}
          </h1>

          {/* Description */}
          {group?.description && (
            <p className="mt-2 text-sm text-slate-600 leading-relaxed min-h-[40px]">
              {group.description}
            </p>
          )}

          {/* Avatars & Lead Admin */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {previews.length > 0 ? (
              <div className="flex -space-x-2 overflow-hidden shrink-0 items-center">
                {previews.map((item, i) => (
                  <HeaderAvatarItem
                    key={item.id || i}
                    member={item}
                    src={item.avatarUrl}
                  />
                ))}
                {remainingCount > 0 && (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 ring-2 ring-white text-[10px] font-bold text-slate-600 shrink-0 select-none">
                    +{remainingCount}
                  </div>
                )}
              </div>
            ) : totalMembers > 0 ? (
              <div className="flex -space-x-2 overflow-hidden shrink-0 items-center">
                <HeaderAvatarItem
                  member={{ name: finalLeadName || group?.name || "U" }}
                />
                {totalMembers > 1 && (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 ring-2 ring-white text-[10px] font-bold text-slate-600 shrink-0 select-none">
                    +{totalMembers - 1}
                  </div>
                )}
              </div>
            ) : null}

            {finalLeadName && (
              <span className="text-xs text-slate-500 font-medium">
                {t("groupDetail.leadAdmin")}{" "}
                <strong className="text-slate-800 font-semibold">
                  {finalLeadName}
                </strong>
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions - Cố định height và min-width chống giật layout */}
        <div className="flex items-center gap-3 shrink-0">
          {canInvite && (
            <Button
              type="button"
              onClick={onOpenInvite}
              variant="outline"
              className="h-9.5 min-w-[140px] justify-center gap-2 border-slate-200 bg-white px-4 font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 cursor-pointer text-xs rounded-xl whitespace-nowrap"
            >
              <UserPlus size={14} className="text-slate-500 shrink-0" />
              <span>{t("groupDetail.inviteMembers")}</span>
            </Button>
          )}

          <Button
            onClick={onOpenCreateCalendar}
            className="h-9.5 min-w-[155px] justify-center gap-2 bg-indigo-600 px-4 font-medium text-white shadow-xs hover:bg-indigo-700 cursor-pointer text-xs rounded-xl whitespace-nowrap"
          >
            <CalendarPlus size={14} className="shrink-0" />
            <span>{t("groupDetail.createCalendar")}</span>
          </Button>
        </div>
      </div>

      {/* Bottom Section: Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-200 pt-2 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={`h-9 ${tab.minW} flex items-center justify-center gap-2 border-b-2 px-4 text-xs font-semibold transition-all cursor-pointer select-none whitespace-nowrap ${
                isActive
                  ? "border-indigo-600 text-indigo-700 font-bold"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    isActive
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default GroupHeader;
