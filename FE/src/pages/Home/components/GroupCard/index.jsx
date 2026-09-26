import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Users,
  Calendar,
  ArrowRight,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { calcPercentage } from "~/utils";

function GroupCard({ group, to = `/groups/${group.id}`, onClick }) {
  const { t } = useTranslation();
  const isOwner = group.role === "Owner";

  // Sử dụng hàm tiện ích dùng chung để tính phần trăm
  const memberPercent = calcPercentage(group.memberCount, group.capacity);

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`group group-theme-${group.color || "indigo"} relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50`}
    >
      <div>
        {/* Card Header: Avatar, Info & Role Badge */}
        <div className="flex items-start justify-between gap-4">
          {/* Avatar Icon dùng biến CSS token từ main.css */}
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-lg font-bold transition-transform duration-200 group-hover:scale-105"
            style={{
              backgroundColor: "var(--theme-bg)",
              color: "var(--theme-text)",
              borderColor: "var(--theme-border)",
            }}
          >
            {group.name.charAt(0)}
          </div>

          {/* Role Badge - Cố định min-width để chống giật chữ khi đổi ngôn ngữ */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isOwner ? (
              <span className="inline-flex min-w-[76px] items-center justify-center gap-1 rounded-full border border-indigo-200/80 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 whitespace-nowrap">
                <ShieldCheck size={12} className="shrink-0" />
                <span>{t("groupCard.owner")}</span>
              </span>
            ) : (
              <span className="inline-flex min-w-[90px] items-center justify-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 whitespace-nowrap">
                <UserCheck size={12} className="shrink-0" />
                <span>{t("groupCard.joined")}</span>
              </span>
            )}
          </div>
        </div>

        {/* Group Name & Cohort */}
        <div className="mt-4">
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
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
          {group.description}
        </p>

        {/* Capacity / Member Progress Bar */}
        <div className="mt-6">
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
      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between text-xs text-slate-500">
          {/* Member avatar stack */}
          <div className="flex -space-x-1.5 overflow-hidden">
            {group.members?.slice(0, 3).map((member, idx) => (
              <img
                key={member.id || idx}
                src={member.avatar}
                alt={member.name}
                className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover"
              />
            ))}
            {group.memberCount > 3 && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600 ring-2 ring-white">
                +{group.memberCount - 3}
              </div>
            )}
          </div>

          {/* Active Sessions badge */}
          <div className="flex items-center gap-1.5 font-medium text-slate-600">
            <Calendar size={14} className="text-slate-400" />
            <span>
              {t("groupCard.sessionsCount", { count: group.activeSessionsCount })}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-4 border-t border-slate-100 pt-3">
          <Button
            variant="ghost"
            className="flex h-10 w-full items-center justify-between rounded-xl px-3.5 pointer-events-none transition-all duration-200 group-hover:bg-indigo-50 group-hover:text-indigo-800"
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-xs font-semibold whitespace-nowrap">
                {t("groupCard.openWorkspace")}
              </span>
              <ArrowRight
                size={15}
                className="shrink-0 text-slate-500 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-indigo-700"
              />
            </div>
          </Button>
        </div>
      </div>
    </Link>
  );
}

export default GroupCard;
