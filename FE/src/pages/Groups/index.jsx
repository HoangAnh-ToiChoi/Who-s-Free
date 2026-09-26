import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Users, AlertCircle, RefreshCw } from "lucide-react";

import { groupService } from "~/service/groupService";
import { Button } from "~/components/ui/button";
import GroupsHeader from "./components/GroupsHeader";
import GroupCard from "./components/GroupCard";

function Groups() {
  const { t } = useTranslation();
  // 1. Data & Async states (quản lý tập trung tại Page cha)
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  // 2. UI Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  /**
   * Hàm gọi Service lấy danh sách nhóm
   */
  const loadGroups = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await groupService.getGroups();
      setGroups(data);
    } catch (err) {
      console.error("Failed to load groups:", err);
      setError(err?.message || "Failed to load groups. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Kích hoạt gọi API khi mount component qua useEffect
   */
  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  /**
   * Hàm xử lý khi component con (Modal) gửi dữ liệu ngược lên để tạo group
   * @param {Object} newGroupPayload - { name, capacity }
   */
  const handleCreateGroup = async (newGroupPayload) => {
    try {
      setIsCreating(true);
      // Gọi service API
      const createdGroup = await groupService.createGroup(newGroupPayload);
      // Cập nhật state UI sau khi tạo thành công
      setGroups((prev) => [createdGroup, ...prev]);
      return { success: true, data: createdGroup };
    } catch (err) {
      console.error("Create group error:", err);
      return {
        success: false,
        error: err?.message || "Unable to create group. Please try again.",
      };
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Lọc danh sách nhóm theo filter role & search query
   */
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      // Filter theo role
      if (activeFilter === "owner" && g.role !== "Owner") return false;
      if (activeFilter === "joined" && g.role !== "Joined") return false;

      // Filter theo từ khóa tìm kiếm (nếu có)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = g.name.toLowerCase().includes(query);
        const matchDesc = g.description?.toLowerCase().includes(query);
        const matchCohort = g.cohort?.toLowerCase().includes(query);
        return matchName || matchDesc || matchCohort;
      }

      return true;
    });
  }, [groups, activeFilter, searchQuery]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-12">
      {/* Header component con: nhận totalCount, filter, callback tạo group và state isCreating */}
      <GroupsHeader
        totalCount={groups.length}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onCreateGroup={handleCreateGroup}
        isCreating={isCreating}
      />

      {/* --- Case 1: Đang tải dữ liệu lần đầu (Loading Skeleton) --- */}
      {isLoading ? (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex h-[280px] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs animate-pulse"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-xl bg-slate-200" />
                  <div className="h-5 w-20 rounded-md bg-slate-100" />
                </div>
                <div className="mt-4 h-5 w-3/4 rounded-md bg-slate-200" />
                <div className="mt-2 h-3.5 w-full rounded-md bg-slate-100" />
                <div className="mt-1 h-3.5 w-2/3 rounded-md bg-slate-100" />
              </div>
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    <div className="h-7 w-7 rounded-full bg-slate-200" />
                    <div className="h-7 w-7 rounded-full bg-slate-200" />
                    <div className="h-7 w-7 rounded-full bg-slate-200" />
                  </div>
                  <div className="h-4 w-16 rounded-md bg-slate-100" />
                </div>
                <div className="h-9 w-full rounded-xl bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        /* --- Case 2: Có lỗi xảy ra khi gọi API --- */
        <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/50 p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertCircle size={24} />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            {t("groups.failedLoad")}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">{error}</p>
          <Button
            onClick={loadGroups}
            className="mt-5 gap-2 bg-indigo-600 px-4 py-2 font-medium text-white shadow-xs hover:bg-indigo-700 cursor-pointer h-9.5 min-w-[120px] justify-center"
          >
            <RefreshCw size={15} />
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

export default Groups;
