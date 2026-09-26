import { useTranslation } from "react-i18next";
import { Users, AlertCircle, RefreshCw } from "lucide-react";

import { useGroups } from "~/hooks";
import { Button } from "~/components/ui/button";
import HomeHeader from "./components/HomeHeader";
import GroupCard from "./components/GroupCard";

function Home() {
  const { t } = useTranslation();

  // Sử dụng Domain Hook chuyên biệt, đóng gói toàn bộ state async, filter & create group
  const {
    groups,
    filteredGroups,
    isLoading,
    isCreating,
    error,
    activeFilter,
    setActiveFilter,
    setSearchQuery,
    loadGroups,
    createGroup,
  } = useGroups();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-12">
      {/* Header component: Nhận dữ liệu và handler từ custom hook */}
      <HomeHeader
        totalCount={groups.length}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onCreateGroup={createGroup}
        isCreating={isCreating}
      />

      {/* --- Case 1: Đang tải dữ liệu (Loading Skeleton) --- */}
      {isLoading ? (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((skeletonId) => (
            <div
              key={skeletonId}
              className="flex h-64 animate-pulse flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-xl bg-slate-200" />
                <div className="h-6 w-16 rounded-full bg-slate-100" />
              </div>
              <div className="space-y-2">
                <div className="h-5 w-3/4 rounded bg-slate-200" />
                <div className="h-3 w-1/3 rounded bg-slate-100" />
                <div className="h-3 w-full rounded bg-slate-100" />
              </div>
              <div className="h-2 w-full rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : error ? (
        /* --- Case 2: Lỗi tải API (Error State) --- */
        <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/50 p-8 text-center shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertCircle size={24} />
          </div>
          <h3 className="mt-4 text-base font-semibold text-rose-900">
            {t("groups.failedLoad")}
          </h3>
          <p className="mt-1 max-w-md text-sm text-rose-600">
            {error || t("groups.failedLoadDesc")}
          </p>
          <Button
            variant="outline"
            onClick={loadGroups}
            className="mt-4 gap-2 border-rose-300 text-rose-700 hover:bg-rose-100 cursor-pointer h-9 min-w-[100px] justify-center"
          >
            <RefreshCw size={14} />
            <span>{t("common.tryAgain")}</span>
          </Button>
        </div>
      ) : filteredGroups.length > 0 ? (
        /* --- Case 3: Hiển thị danh sách Cards thành công --- */
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              to={`/groups/${group.id}`}
            />
          ))}
        </div>
      ) : (
        /* --- Case 4: Không có nhóm nào phù hợp bộ lọc --- */
        <div className="mt-16 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Users size={24} />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-slate-900">
            {t("groups.emptyTitle")}
          </h3>
          <p className="mt-1 max-w-xs text-xs text-slate-500">
            {t("groups.emptyDesc")}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setActiveFilter("all");
            }}
            className="mt-4 cursor-pointer text-xs font-semibold text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 h-8 min-w-[110px] justify-center"
          >
            {t("groups.clearFilters")}
          </Button>
        </div>
      )}
    </div>
  );
}

export default Home;
