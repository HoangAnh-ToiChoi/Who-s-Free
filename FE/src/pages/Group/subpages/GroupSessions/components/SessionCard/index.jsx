import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  MoreHorizontal,
  ArrowRight,
  Star,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

// Tách hàm xác định style cho từng loại thẻ session
function getSessionTheme(tagColor) {
  switch (tagColor) {
    case "primary": // Executive Quorum / Confirmed
      return {
        badge: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
        progressTrack: "bg-indigo-100/60",
        progressBar: "bg-indigo-600",
        highlightBg: "bg-indigo-50/80 border-indigo-200/60 text-indigo-800",
        highlightIcon: Star,
        buttonPrimary: true,
      };
    case "secondary": // Technical Sprint
      return {
        badge: "bg-purple-50 text-purple-700 border-purple-200/80",
        progressTrack: "bg-purple-100/60",
        progressBar: "bg-purple-600",
        highlightBg: "bg-purple-50/80 border-purple-200/60 text-purple-800",
        highlightIcon: CheckCircle2,
        buttonPrimary: false,
      };
    case "tertiary": // External Outreach
    default:
      return {
        badge: "bg-amber-50 text-amber-700 border-amber-200/80",
        progressTrack: "bg-amber-100/60",
        progressBar: "bg-amber-600",
        highlightBg: "bg-amber-50/80 border-amber-200/60 text-amber-800",
        highlightIcon: Clock,
        buttonPrimary: false,
      };
  }
}

function SessionCard({ session }) {
  const { t } = useTranslation();
  const theme = getSessionTheme(session.tagColor);
  const HighlightIcon = theme.highlightIcon;

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      {/* Top Header: Tag & Options Menu */}
      <div>
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase select-none whitespace-nowrap",
              theme.badge
            )}
          >
            {session.tag}
          </span>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>

        {/* Title & Date Range */}
        <h3 className="mt-3 text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 min-h-[24px]">
          {session.title}
        </h3>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
          <Calendar size={13} className="text-slate-400 shrink-0" />
          <span className="truncate">{session.dateRange}</span>
        </div>

        {/* Response Count & Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-700">
              {t("groupDetail.responded", {
                responded: session.respondedCount,
                total: session.totalMembers,
              })}
            </span>
            <span className="text-slate-900 shrink-0">{session.quorumPercent}%</span>
          </div>

          <div
            className={cn(
              "mt-2 h-1.5 w-full overflow-hidden rounded-full",
              theme.progressTrack
            )}
          >
            <div
              className={cn("h-full rounded-full transition-all duration-500", theme.progressBar)}
              style={{ width: `${session.quorumPercent}%` }}
            />
          </div>
        </div>

        {/* Overlap Mini Sparkline */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            {t("groupDetail.overlap")}
          </span>
          <div className="flex items-end gap-1 h-5">
            {(session.sparkline || [20, 40, 70, 100, 50]).map((val, idx) => (
              <div
                key={idx}
                className={cn(
                  "w-1.5 rounded-xs transition-all",
                  val >= 80
                    ? theme.progressBar
                    : val >= 50
                    ? "bg-slate-400"
                    : "bg-slate-200"
                )}
                style={{ height: `${Math.max(val * 0.2, 3)}px` }}
              />
            ))}
          </div>
        </div>

        {/* Highest Overlap Banner */}
        <div
          className={cn(
            "mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium min-h-[36px]",
            theme.highlightBg
          )}
        >
          <HighlightIcon size={14} className="shrink-0" />
          <span className="truncate">{session.highestOverlapText}</span>
        </div>
      </div>

      {/* CTA Button - Cố định height h-10 chống giật */}
      <div className="mt-5 pt-3 border-t border-slate-100/80">
        {theme.buttonPrimary ? (
          <Link to={`/matrix?session=${session.id}`}>
            <Button
              className="w-full justify-center gap-2 bg-indigo-600 text-white font-semibold shadow-xs hover:bg-indigo-700 cursor-pointer text-xs h-10 rounded-xl whitespace-nowrap"
            >
              <span>{t("groupDetail.openAsLead")}</span>
              <ArrowRight size={14} className="shrink-0" />
            </Button>
          </Link>
        ) : (
          <Link to={`/matrix?session=${session.id}`}>
            <Button
              variant="outline"
              className="w-full justify-center gap-2 border-slate-200 bg-white font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 cursor-pointer text-xs h-10 rounded-xl whitespace-nowrap"
            >
              <span>{t("groupDetail.openCalendar")}</span>
              <ArrowRight size={14} className="shrink-0" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

export default SessionCard;
