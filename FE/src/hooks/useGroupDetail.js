import { useState, useEffect, useCallback } from "react";
import { groupService } from "~/service/groupService";
import { calendarService } from "~/service/calendarService";

/**
 * Custom hook quản lý dữ liệu chi tiết nhóm, danh sách lịch khảo sát và thao tác tạo lịch.
 *
 * @param {string} groupId - ID của nhóm hiện tại
 */
export function useGroupDetail(groupId = "ws-1") {
  const [group, setGroup] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingCalendar, setIsCreatingCalendar] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("calendars");

  /**
   * Tải đồng thời thông tin group và các sessions
   */
  const loadGroupData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [groupRes, sessionsRes] = await Promise.all([
        groupService.getGroupById(groupId).catch(() => null),
        calendarService.getGroupCalendars(groupId),
      ]);

      setGroup(groupRes);
      setSessions(sessionsRes);
    } catch (err) {
      console.error("Failed to load group details:", err);
      setError(err?.message || "Failed to load group calendar sessions.");
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  /**
   * Tự động nạp lại khi groupId thay đổi
   */
  useEffect(() => {
    loadGroupData();
  }, [loadGroupData]);

  /**
   * Tạo lịch trình khảo sát mới
   * @param {Object} calendarPayload
   */
  const createCalendar = async (calendarPayload) => {
    try {
      setIsCreatingCalendar(true);
      const createdSession = await calendarService.createCalendar(
        groupId,
        calendarPayload
      );
      setSessions((prev) => [createdSession, ...prev]);
      return { success: true, data: createdSession };
    } catch (err) {
      console.error("Failed to create calendar:", err);
      return {
        success: false,
        error: err?.message || "Unable to create calendar session.",
      };
    } finally {
      setIsCreatingCalendar(false);
    }
  };

  return {
    group,
    sessions,
    isLoading,
    isCreatingCalendar,
    error,
    activeTab,
    setActiveTab,
    loadGroupData,
    createCalendar,
  };
}

export default useGroupDetail;
