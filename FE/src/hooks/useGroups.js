import { useState, useEffect, useMemo, useCallback } from "react";
import { groupService } from "~/service/groupService";

/**
 * Custom hook quản lý toàn bộ vòng đời dữ liệu, tìm kiếm, lọc và tạo nhóm tại Trang chủ (Home).
 */
export function useGroups() {
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  /**
   * Tải danh sách nhóm từ service
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
   * Kích hoạt tự động khi mount
   */
  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  /**
   * Tạo nhóm mới và cập nhật state danh sách
   * @param {Object} payload - { name, capacity }
   */
  const createGroup = async (payload) => {
    try {
      setIsCreating(true);
      const createdGroup = await groupService.createGroup(payload);
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
   * Danh sách nhóm sau khi áp dụng bộ lọc và từ khóa tìm kiếm
   */
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      // Lọc theo role
      if (activeFilter === "owner" && g.role !== "Owner") return false;
      if (activeFilter === "joined" && g.role !== "Joined") return false;

      // Lọc theo từ khóa tìm kiếm
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

  return {
    groups,
    filteredGroups,
    isLoading,
    isCreating,
    error,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    loadGroups,
    createGroup,
  };
}

export default useGroups;
