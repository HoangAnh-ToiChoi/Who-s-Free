import { useTranslation } from "react-i18next";
import {
  Calendar,
  Activity,
  Clock,
  RefreshCw,
} from "lucide-react";

function GroupMetricsBar({ activeSessionsCount = 3, turnoutRate = 88 }) {
  const { t } = useTranslation();

  const metrics = [
    {
      id: "active",
      value: t("groupDetail.metrics.activeCount", { count: activeSessionsCount }),
      label: t("groupDetail.metrics.activePolls"),
      icon: Calendar,
      iconColor: "text-indigo-600 bg-indigo-50 border-indigo-200/60",
    },
    {
      id: "turnout",
      value: `${turnoutRate}%`,
      label: t("groupDetail.metrics.turnout"),
      icon: Activity,
      iconColor: "text-purple-600 bg-purple-50 border-purple-200/60",
    },
    {
      id: "response",
      value: t("groupDetail.metrics.responseValue"),
      label: t("groupDetail.metrics.response"),
      icon: Clock,
      iconColor: "text-blue-600 bg-blue-50 border-blue-200/60",
    },
    {
      id: "feeds",
      value: t("groupDetail.metrics.feedsValue"),
      label: t("groupDetail.metrics.feeds"),
      icon: RefreshCw,
      iconColor: "text-slate-600 bg-slate-50 border-slate-200/80",
    },
  ];

  return (
    <div className="mt-12 space-y-6">
      {/* 4 Cards Grid - Card có min-h cố định chống giật */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="flex min-h-[72px] items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${item.iconColor}`}
              >
                <Icon size={18} strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-900 truncate">
                  {item.value}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {item.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Subtle status footer */}
      <div className="flex flex-col gap-2 pt-4 border-t border-slate-200/80 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="font-medium text-slate-600 truncate">
            {t("groupDetail.metrics.systemOperational")}
          </span>
        </div>
        <div className="shrink-0">{t("groupDetail.metrics.copyright")}</div>
      </div>
    </div>
  );
}

export default GroupMetricsBar;
