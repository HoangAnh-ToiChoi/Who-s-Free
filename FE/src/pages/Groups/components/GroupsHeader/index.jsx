import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { CreateGroupModal } from "~/components/Modals";

function GroupsHeader({
  totalCount,
  activeFilter,
  onFilterChange,
  onCreateGroup,
  onGroupCreated,
  isCreating = false,
}) {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);

  const filters = [
    { id: "all", label: t("groups.filterAll"), minW: "min-w-[90px]" },
    { id: "owner", label: t("groups.filterOwner"), minW: "min-w-[125px]" },
    { id: "joined", label: t("groups.filterJoined"), minW: "min-w-[95px]" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Top row: Title and Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {t("groups.title")}
            </h1>
            <span className="inline-flex min-w-[65px] justify-center rounded-full bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 whitespace-nowrap">
              {t("groups.totalCount", { count: totalCount })}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {t("groups.subtitle")}
          </p>
        </div>

        {/* Action Button - Cố định min-width và height để chống giật giao diện */}
        <div className="shrink-0">
          <Button
            onClick={() => setModalOpen(true)}
            className="h-10 min-w-[170px] gap-2 bg-indigo-600 px-4 font-medium text-white shadow-xs hover:bg-indigo-700 cursor-pointer whitespace-nowrap justify-center"
          >
            <Plus size={16} strokeWidth={2.5} className="shrink-0" />
            <span>{t("groups.createNewGroup")}</span>
          </Button>

          <CreateGroupModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            onSubmit={onCreateGroup || onGroupCreated}
            isSubmitting={isCreating}
          />
        </div>
      </div>

      {/* Bottom row: Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        {/* Filter Pills - Cố định min-width trên từng pill */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {filters.map((f) => {
            const isActive = activeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => onFilterChange(f.id)}
                className={`h-8 ${f.minW} flex items-center justify-center rounded-lg px-3.5 text-xs font-semibold transition-colors cursor-pointer select-none whitespace-nowrap ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default GroupsHeader;
