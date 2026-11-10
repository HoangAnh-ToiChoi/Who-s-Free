import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Users,
  Calendar,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { calcPercentage } from "~/utils";
import { getGroupThemeColor } from "~/data/groupPalettes";
import MemberAvatarStack from "./MemberAvatarStack";
import ActionMenu from "~/components/ActionMenu";
import { GroupManageDialogs, useGroupManageMenu } from "~/components/GroupManage";

// Tải sẵn trang nhóm khi người dùng rê chuột / focus vào thẻ để lúc bấm chuyển trang không bị khựng
const preloadGroupPage = () => import("~/pages/Group");

function GroupCard({ group, to = `/groups/${group.id}`, onClick }) {
  const { t } = useTranslation();
  const { items: manageItems, mode, setMode } = useGroupManageMenu(group.userRole);
  const isOwner = group.role === "Owner";
  const themeColor = getGroupThemeColor(group);

  // Sử dụng hàm tiện ích dùng chung để tính phần trăm
  const memberPercent = calcPercentage(group.memberCount, group.capacity);

  // Modal nằm NGOÀI <Link>: sự kiện trong modal (portal) vẫn nổi lên cây React và sẽ kích hoạt Link nếu đặt bên trong
  return (
    <>
    <Link
      to={to}
      onClick={onClick}
      onMouseEnter={preloadGroupPage}
      onFocus={preloadGroupPage}
      onTouchStart={preloadGroupPage}
      className={`group group-theme-${themeColor} relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-3 md:p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md`}
    >
      <div>
        {/* Card Header: Avatar, Info & Role Badge */}
        {/* Mobile: thẻ thu thành 1 dòng (avatar · tên · trạng thái · mũi tên), cả dòng bấm được */}
        <div className="flex items-center gap-3 md:items-start md:justify-between md:gap-4">
          {/* Avatar Icon dùng biến CSS token từ main.css */}
          <div
            className="flex h-11 w-11 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-xl border text-lg font-bold transition-transform duration-200 group-hover:scale-105"
            style={{
              backgroundColor: "var(--theme-bg)",
              color: "var(--theme-text)",
              borderColor: "var(--theme-border)",
            }}
          >
            {group.name.charAt(0)}
          </div>

          <div className="min-w-0 flex-1 md:hidden">
            <h3 className="truncate text-[15px] font-bold text-slate-900">{group.name}</h3>
            <p className="truncate text-xs text-slate-500">
              {group.memberCount}/{group.capacity} {t("groupCard.members")}
              {Number.isFinite(Number(group.activeSessionsCount)) &&
                ` · ${t("groupCard.sessionsCount", { count: group.activeSessionsCount })}`}
            </p>
          </div>

          {/* Role Badge - Cố định min-width để chống giật chữ khi đổi ngôn ngữ */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isOwner ? (
              <span className="inline-flex md:min-w-[76px] items-center justify-center gap-1 rounded-full border border-indigo-200/80 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 whitespace-nowrap">
                <ShieldCheck size={12} className="shrink-0" />
                <span>{t("groupCard.owner")}</span>
              </span>
            ) : (
              <span className="inline-flex md:min-w-[90px] items-center justify-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 whitespace-nowrap">
                <UserCheck size={12} className="shrink-0" />
                <span>{t("groupCard.joined")}</span>
              </span>
            )}
          </div>
          <ActionMenu items={manageItems} label={t("groupActions.menu")} buttonClassName="max-md:h-9 max-md:w-9" />
          <ChevronRight size={18} className="shrink-0 text-slate-400 md:hidden" aria-hidden="true" />
        </div>

        {/* Group Name & Cohort */}
        <div className="mt-4 hidden md:block">
          <h3 className="text-lg font-bold text-slate-900 transition-colors group-hover:text-indigo-600 line-clamp-1">
            {group.name}
          </h3>
          {group.cohort && (
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-0.5">
              {group.cohort}
            </p>
          )}
        </div>

        {/* Description */}
        <p className="mt-2 hidden md:line-clamp-2 text-xs leading-relaxed text-slate-500">
          {group.description}
        </p>

        {/* Capacity / Member Progress Bar */}
        <div className="mt-6 hidden md:block">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Users size={14} className="text-slate-400" />
              {group.memberCount} / {group.capacity} {t("groupCard.members")}
            </span>
            <span className="font-semibold text-slate-700">{memberPercent}%</span>
          </div>
          {/* Progress track dùng biến màu CSS từ main.css */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${memberPercent}%`,
                backgroundColor: "var(--theme-progress)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Card Footer: Active Planning Sessions, Avatars & Open Button */}
      <div className="mt-6 hidden pt-4 border-t border-slate-100 md:block">
        <div className="flex items-center justify-between text-xs text-slate-500">
          {/* Member avatar stack */}
          <MemberAvatarStack
            members={group.memberPreviews}
            totalCount={group.memberCount}
          />

          {/* Active Sessions badge */}
          {Number.isFinite(Number(group.activeSessionsCount)) && group.activeSessionsCount !== null && group.activeSessionsCount !== undefined && (
            <div className="flex items-center gap-1.5 font-medium text-slate-600">
              <Calendar size={14} className="text-slate-400" />
              <span>{t("groupCard.sessionsCount", { count: group.activeSessionsCount })}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-4 border-t border-slate-100 pt-3">
          <Button
            variant="outline"
            className="h-10 w-full cursor-pointer justify-center gap-2 rounded-xl border-slate-200 bg-white text-xs font-medium whitespace-nowrap text-slate-700 shadow-2xs transition-all duration-200 group-hover:border-indigo-600 group-hover:bg-indigo-600 group-hover:font-semibold group-hover:text-white group-hover:shadow-md group-hover:shadow-indigo-500/20 hover:!border-indigo-700 hover:!bg-indigo-700 hover:!text-white active:scale-[0.99]"
          >
            <span>{t("groupCard.openWorkspace")}</span>
            <ArrowRight
              size={14}
              className="shrink-0 text-slate-400 transition-all duration-200 group-hover:translate-x-1 group-hover:text-white"
            />
          </Button>
        </div>
      </div>
    </Link>
    <GroupManageDialogs group={group} mode={mode} onModeChange={setMode} />
    </>
  );
}

export default GroupCard;
