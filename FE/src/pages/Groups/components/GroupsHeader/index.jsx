import { useState } from "react";
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
  const [modalOpen, setModalOpen] = useState(false);

  const filters = [
    { id: "all", label: "All Groups" },
    { id: "owner", label: "Owned by you" },
    { id: "joined", label: "Joined" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Top row: Title and Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Groups
            </h1>
            <span className="rounded-full bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              {totalCount} total
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Coordinate availability matrices, weekly meeting schedules, and member rosters.
          </p>
        </div>

        {/* Action Button */}
        <div>
          <Button
            onClick={() => setModalOpen(true)}
            className="gap-2 bg-indigo-600 px-4 py-2 font-medium text-white shadow-xs hover:bg-indigo-700 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Create New Group</span>
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
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {filters.map((f) => {
            const isActive = activeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => onFilterChange(f.id)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer select-none ${
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
