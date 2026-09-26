import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { AlertCircle, RefreshCw } from "lucide-react";

import { groupService } from "~/service/groupService";
import { calendarService } from "~/service/calendarService";
import { Button } from "~/components/ui/button";

import GroupInfoBar from "./components/GroupInfoBar";
import ActivePlanningSessions from "./components/ActivePlanningSessions";
import GroupMetricsBar from "./components/GroupMetricsBar";

function GroupDetail() {
  const { t } = useTranslation();
  const { groupId = "ws-1" } = useParams();
  const navigate = useNavigate();

  // 1. Data states
  const [group, setGroup] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingCalendar, setIsCreatingCalendar] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("calendars");

  /**
   * Tải thông tin group và danh sách sessions đồng thời (Tách hàm fetch rõ ràng)
   */
  const loadGroupAndCalendars = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Gọi đồng thời cả 2 services
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
   * Kích hoạt gọi API qua useEffect khi mount hoặc khi groupId thay đổi
   */
  useEffect(() => {
    loadGroupAndCalendars();
  }, [loadGroupAndCalendars]);

  /**
   * Hàm xử lý khi Modal tạo Calendar gửi dữ liệu ngược lên (Events Up)
   * @param {Object} calendarPayload - Dữ liệu session mới
   */
  const handleCreateCalendar = async (calendarPayload) => {
    try {
      setIsCreatingCalendar(true);
      const createdSession = await calendarService.createCalendar(
        groupId,
        calendarPayload
      );
      // Cập nhật danh sách sessions
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

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-12">
      {/* --- Case 1: Đang tải dữ liệu lần đầu (Skeleton) --- */}
      {isLoading ? (
        <div className="space-y-8 animate-pulse">
          {/* Header Skeleton */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="h-5 w-28 rounded-md bg-slate-200" />
              <div className="h-5 w-20 rounded-md bg-slate-200" />
            </div>
            <div className="h-9 w-72 rounded-lg bg-slate-200" />
            <div className="h-4 w-96 rounded-md bg-slate-100" />
          </div>

          {/* Cards Skeleton */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-72 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
              >
                <div className="flex justify-between">
                  <div className="h-4 w-24 rounded-md bg-slate-200" />
                  <div className="h-4 w-4 rounded-full bg-slate-200" />
                </div>
                <div className="mt-4 h-5 w-40 rounded-md bg-slate-200" />
                <div className="mt-2 h-3.5 w-28 rounded-md bg-slate-100" />
                <div className="mt-6 h-2 w-full rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        /* --- Case 2: Lỗi khi tải dữ liệu --- */
        <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/50 p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertCircle size={24} />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            {t("groupDetail.failedLoad")}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">{error}</p>
          <Button
            onClick={loadGroupAndCalendars}
            className="mt-5 gap-2 bg-indigo-600 px-4 py-2 font-medium text-white shadow-xs hover:bg-indigo-700 cursor-pointer h-9.5 min-w-[120px] justify-center"
          >
            <RefreshCw size={15} />
            <span>{t("common.tryAgain")}</span>
          </Button>
        </div>
      ) : (
        /* --- Case 3: Hiển thị đầy đủ --- */
        <>
          {/* Group Overview Header + Modal Trigger */}
          <GroupInfoBar
            group={group}
            sessionsCount={sessions.length}
            onCreateCalendar={handleCreateCalendar}
            isCreatingCalendar={isCreatingCalendar}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* Tab 1: Calendars / Planning Sessions */}
          {activeTab === "calendars" && (
            <>
              <ActivePlanningSessions sessions={sessions} />
              <GroupMetricsBar
                activeSessionsCount={sessions.length}
                turnoutRate={group?.responseRate || 88}
              />
            </>
          )}

          {/* Tab 2: Members */}
          {activeTab === "members" && (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              {t("groupDetail.membersComingSoon")}
            </div>
          )}

          {/* Tab 3: Settings */}
          {activeTab === "settings" && (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              {t("groupDetail.settingsComingSoon")}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default GroupDetail;
