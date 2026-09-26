import { useTranslation } from "react-i18next";
import { SlidersHorizontal, Calendar, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import SessionCard from "./components/SessionCard";

function GroupSessions({ sessions = [], onOpenCreateModal }) {
  const { t } = useTranslation();

  return (
    <section className="mt-8">
      {/* Section Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            {t("groupDetail.activePlanningSessions")}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {t("groupDetail.activePlanningSessionsDesc")}
          </p>
        </div>

        {/* Right status badge & filter control - Cố định kích thước chống giật */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex min-w-[145px] items-center justify-center gap-1.5 rounded-full border border-indigo-200/60 bg-indigo-50/70 px-3 py-1 text-xs font-semibold text-indigo-700 shadow-2xs whitespace-nowrap">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse shrink-0" />
            <span>{t("groupDetail.autoSyncEnabled")}</span>
          </div>

          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-2xs hover:bg-slate-50 hover:text-slate-700 cursor-pointer shrink-0"
            title="Filter sessions"
          >
            <SlidersHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Grid of Session Cards */}
      {sessions.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Calendar size={22} />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-slate-900">
            {t("groupDetail.noSessionsTitle")}
          </h3>
          <p className="mt-1 max-w-xs text-xs text-slate-500">
            {t("groupDetail.noSessionsDesc")}
          </p>
          <Button
            onClick={onOpenCreateModal}
            className="mt-4 gap-2 bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 cursor-pointer h-9 min-w-[170px] justify-center"
          >
            <Plus size={14} className="shrink-0" />
            <span>{t("groupDetail.createSession")}</span>
          </Button>
        </div>
      )}
    </section>
  );
}

export default GroupSessions;
