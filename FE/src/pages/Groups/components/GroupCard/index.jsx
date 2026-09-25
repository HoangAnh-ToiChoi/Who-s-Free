import { Link } from "react-router";
import {
  Users,
  Calendar,
  ArrowRight,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Button } from "~/components/ui/button";

const COLOR_STYLES = {
  indigo: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    badge: "bg-indigo-100/80 text-indigo-800",
    progress: "bg-indigo-600",
  },
  teal: {
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
    badge: "bg-teal-100/80 text-teal-800",
    progress: "bg-teal-600",
  },
  emerald: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    badge: "bg-emerald-100/80 text-emerald-800",
    progress: "bg-emerald-600",
  },
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    badge: "bg-amber-100/80 text-amber-800",
    progress: "bg-amber-500",
  },
  purple: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    badge: "bg-purple-100/80 text-purple-800",
    progress: "bg-purple-600",
  },
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    badge: "bg-blue-100/80 text-blue-800",
    progress: "bg-blue-600",
  },
};

function GroupCard({ group, to = "/matrix", onClick }) {
  const styles = COLOR_STYLES[group.color] || COLOR_STYLES.indigo;
  const isOwner = group.role === "Owner";
  const capacityPercent = Math.min(
    Math.round((group.memberCount / group.capacity) * 100),
    100,
  );

  return (
    <Link
      to={to}
      onClick={onClick}
      className="group relative block flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-200 select-none hover:-translate-y-0.5 hover:border-indigo-500/40 hover:shadow-md"
    >
      {/* Top Section */}
      <div>
        <div className="flex items-start justify-between gap-3">
          {/* Avatar Icon */}
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold shadow-2xs ${styles.bg} ${styles.text}`}
          >
            {group.name.charAt(0)}
          </div>

          {/* Role badge */}
          <div className="flex items-center gap-1.5">
            {isOwner ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                <ShieldCheck size={13} className="shrink-0" />
                Owner
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                <UserCheck size={13} className="shrink-0 text-slate-400" />
                Member
              </span>
            )}
          </div>
        </div>

        {/* Title & Cohort */}
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="line-clamp-1 text-base font-semibold text-slate-900 transition-colors group-hover:text-indigo-700">
              {group.name}
            </h3>
          </div>
          {group.cohort && (
            <span className="mt-1 inline-block text-[11px] font-medium tracking-wide text-slate-600 uppercase">
              {group.cohort}
            </span>
          )}
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-700">
            {group.description}
          </p>
        </div>
      </div>

      {/* Middle & Bottom Section */}
      <div className="mt-5 border-t border-slate-100 pt-4">
        {/* Capacity / Member Stats */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <Users size={14} className="text-slate-600" />
            <span>
              {group.memberCount}
              <span className="font-normal text-slate-600">
                {" "}
                / {group.capacity} members
              </span>
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-600">
            {capacityPercent}% filled
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-300 ${styles.progress}`}
            style={{ width: `${capacityPercent}%` }}
          />
        </div>

        {/* Active sessions & Avatars stack */}
        <div className="mt-4 flex items-center justify-between">
          {/* Member avatars */}
          <div className="flex items-center -space-x-2 overflow-hidden">
            {group.avatarPreviews?.slice(0, 3).map((avatar, idx) => (
              <img
                key={idx}
                src={avatar}
                alt="Member"
                className="inline-block h-6 w-6 rounded-full object-cover ring-2 ring-white"
              />
            ))}
            {group.memberCount > 3 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-1 text-[10px] font-semibold text-slate-600 ring-2 ring-white">
                +{group.memberCount - 3}
              </span>
            )}
          </div>

          {/* Active sessions tag */}
          <div className="flex items-center gap-1 text-xs font-medium text-slate-700">
            <Calendar size={13} className="text-emerald-700" />
            <span>{group.activeSessionsCount} active polls</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-4 border-t border-slate-100 pt-3">
          <Button
            variant="ghost"
            className="flex h-10 w-full items-center justify-between rounded-xl px-3.5 pointer-events-none transition-all duration-200 group-hover:bg-indigo-50 group-hover:text-indigo-800"
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-xs font-semibold">Open Schedule</span>
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
