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
      iconColor: "text-indigo-600 bg-indigo-50 border-indigo-200/80 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600",
      hoverBorder: "hover:border-indigo-300 hover:shadow-indigo-500/10",
      accentLine: "from-indigo-500 to-violet-500",
      valueHover: "group-hover:text-indigo-600",
      iconTransform: "group-hover:-rotate-6 group-hover:scale-110",
    },
    {
      id: "turnout",
      value: `${turnoutRate}%`,
      label: t("groupDetail.metrics.turnout"),
      icon: Activity,
      iconColor: "text-purple-600 bg-purple-50 border-purple-200/80 group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600",
      hoverBorder: "hover:border-purple-300 hover:shadow-purple-500/10",
      accentLine: "from-purple-500 to-pink-500",
      valueHover: "group-hover:text-purple-600",
      iconTransform: "group-hover:scale-115 group-hover:rotate-3",
    },
    {
      id: "response",
      value: t("groupDetail.metrics.responseValue"),
      label: t("groupDetail.metrics.response"),
      icon: Clock,
      iconColor: "text-blue-600 bg-blue-50 border-blue-200/80 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600",
      hoverBorder: "hover:border-blue-300 hover:shadow-blue-500/10",
      accentLine: "from-blue-500 to-cyan-500",
      valueHover: "group-hover:text-blue-600",
      iconTransform: "group-hover:scale-115 group-hover:-rotate-6",
    },
    {
      id: "feeds",
      value: t("groupDetail.metrics.feedsValue"),
      label: t("groupDetail.metrics.feeds"),
      icon: RefreshCw,
      iconColor: "text-emerald-600 bg-emerald-50 border-emerald-200/80 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600",
      hoverBorder: "hover:border-emerald-300 hover:shadow-emerald-500/10",
      accentLine: "from-emerald-500 to-teal-500",
      valueHover: "group-hover:text-emerald-600",
      iconTransform: "group-hover:rotate-180 duration-700 ease-in-out",
    },
  ];

  return (
    <div className="mt-12 space-y-6">
      {/* 4 Cards Grid - Thêm hiệu ứng hover nổi bật, vạch accent đổi màu và icon micro-animations */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`group relative flex min-h-[76px] items-center gap-3.5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg ${item.hoverBorder} cursor-pointer`}
            >
              {/* Top Accent Gradient Line on Hover */}
              <div
                className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${item.accentLine} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
              />

              {/* Icon Container with interactive transform */}
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 shadow-2xs ${item.iconColor} ${item.iconTransform}`}
              >
                <Icon size={19} strokeWidth={2.2} />
              </div>

              {/* Text Information */}
              <div className="min-w-0 flex-1">
                <div
                  className={`text-sm font-bold text-slate-900 transition-colors duration-200 truncate ${item.valueHover}`}
                >
                  {item.value}
                </div>
                <div className="text-xs text-slate-500 truncate mt-0.5 font-medium transition-colors group-hover:text-slate-700">
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
