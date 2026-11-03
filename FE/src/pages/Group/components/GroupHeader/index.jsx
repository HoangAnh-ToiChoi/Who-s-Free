import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Users,
  CalendarPlus,
  UserPlus,
  Bot,
  ArrowLeft,
  Settings,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { useCurrentUser } from "~/hooks";
import HeaderAvatarItem from "./HeaderAvatarItem";
import GroupTabs from "./GroupTabs";

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
    { id: "calendars", label: t("groupDetail.tabCalendars"), count: sessionsCount, minW: "sm:min-w-[105px]" },
    { id: "members", label: t("groupDetail.tabMembers"), count: group?.memberCount || 0, minW: "sm:min-w-[110px]" },
    { id: "settings", label: t("groupDetail.tabSettings"), minW: "sm:min-w-[85px]" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Back to Home breadcrumb */}
      {/* Mobile: 1 thanh gọn — quay lại · tên nhóm · mời · cài đặt (thay cho tab Cài đặt) */}
      <div className="-mx-2 -mt-2 flex items-center gap-1 sm:hidden">
        <Link to="/" aria-label={t("common.backToHome")} className="flex h-11 w-11 items-center justify-center text-slate-500">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-slate-900">{group?.name || ""}</h1>
        {canInvite && (
          <button type="button" onClick={onOpenInvite} aria-label={t("groupDetail.inviteMembers")} className="flex h-11 w-11 items-center justify-center text-slate-500">
            <UserPlus size={20} />
          </button>
        )}
        <button type="button" onClick={() => onTabChange?.("settings")} aria-label={t("groupDetail.tabSettings")} className="flex h-11 w-11 items-center justify-center text-slate-500">
          <Settings size={20} />
        </button>
      </div>

      <div className="hidden items-center gap-1.5 text-xs sm:flex">
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
          <div className="hidden flex-wrap items-center gap-2 sm:flex">
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
          <h1 className="mt-3 hidden text-2xl font-extrabold sm:block tracking-tight text-slate-900 sm:text-3xl lg:text-4xl break-words">
            {group?.name || ""}
          </h1>

          {/* Description */}
          {group?.description && (
            <p className="text-sm text-slate-600 leading-relaxed max-sm:line-clamp-2 sm:mt-2 sm:min-h-[40px]">
              {group.description}
            </p>
          )}

          {/* Avatars & Lead Admin */}
          <div className="mt-3 flex flex-wrap items-center gap-3 sm:mt-4">
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

        {/* Right: Actions */}
        {/* Mobile: nút Tạo lịch trình ghim đáy màn hình (fixed), trang Group chừa pb tương ứng */}
        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          {canInvite && (
            <Button
              type="button"
              onClick={onOpenInvite}
              variant="outline"
              className="hidden h-9.5 min-w-[140px] justify-center gap-2 border-slate-200 sm:inline-flex bg-white px-4 font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 cursor-pointer text-xs rounded-xl whitespace-nowrap"
            >
              <UserPlus size={14} className="text-slate-500 shrink-0" />
              <span>{t("groupDetail.inviteMembers")}</span>
            </Button>
          )}

          <Button
            onClick={onOpenCreateCalendar}
            className="h-9.5 min-w-[155px] justify-center gap-2 bg-indigo-600 px-4 font-medium text-white shadow-xs hover:bg-indigo-700 cursor-pointer text-xs rounded-xl whitespace-nowrap max-sm:fixed max-sm:inset-x-4 max-sm:bottom-4 max-sm:z-40 max-sm:h-12 max-sm:text-sm max-sm:shadow-lg"
          >
            <CalendarPlus size={14} className="shrink-0" />
            <span>{t("groupDetail.createCalendar")}</span>
          </Button>
        </div>
      </div>

      <GroupTabs tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}

export default GroupHeader;
