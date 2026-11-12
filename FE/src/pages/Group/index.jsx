import { useCallback, useState } from "react";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { AlertCircle, RefreshCw, CalendarPlus } from "lucide-react";

import { useGroupDetail } from "~/hooks";
import { Button } from "~/components/ui/button";
import SlideIn from "~/components/SlideIn";
import { InviteMembersModal, CreateCalendarModal } from "~/components/Modals";
import { calculateGroupMetrics } from "~/utils";

import GroupHeader from "~/pages/Group/components/GroupHeader";
import NotMemberNotice from "~/pages/Group/components/NotMemberNotice";
import BodyPortal from "~/components/BodyPortal";
import GroupMetricsBar from "~/pages/Group/components/GroupMetricsBar";
import GroupSessions from "~/pages/Group/subpages/GroupSessions";
import GroupMembers from "~/pages/Group/subpages/GroupMembers";
import GroupSettings from "~/pages/Group/subpages/GroupSettings";
import { useGroupMembersSync } from "~/pages/Group/hooks/useGroupMembersSync";

function Group() {
  const { t } = useTranslation();
  const { groupId } = useParams();

  const {
    group,
    sessions,
    isLoading,
    isCreatingCalendar,
    error,
    isForbidden,
    activeTab,
    setActiveTab,
    loadGroupData,
    createCalendar,
  } = useGroupDetail(groupId);

  // Modal dùng chung cho Header, tab Members và Empty State của GroupSessions
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCreateCalendarOpen, setIsCreateCalendarOpen] = useState(false);

  // Sau khi sửa/xóa phiên, sửa nhóm hoặc đổi thành viên: tải lại không hiện skeleton
  const refreshGroup = useCallback(() => loadGroupData({ silent: true }), [loadGroupData]);
  useGroupMembersSync(group?.id, refreshGroup);

  // Chỉ trưởng nhóm/chủ nhóm được tạo lịch trình, sửa/xóa phiên (BE cũng chặn 403)
  const canCreateCalendar = ["owner", "lead"].includes((group?.userRole || group?.role || "").toLowerCase());

  return (
    <div className={`mx-auto max-w-7xl px-4 pt-4 ${canCreateCalendar ? "pb-24" : "pb-6"} sm:px-6 sm:py-8 lg:px-12`}>
      {/* --- Case 1: Đang tải dữ liệu lần đầu (Skeleton) --- */}
      {isLoading ? (
        <div className="space-y-8 animate-pulse">
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
      ) : isForbidden ? (
        <NotMemberNotice />
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
            onClick={() => loadGroupData()}
            className="mt-5 gap-2 bg-indigo-600 px-4 py-2 font-medium text-white shadow-xs hover:bg-indigo-700 cursor-pointer h-9.5 min-w-[120px] justify-center"
          >
            <RefreshCw size={15} />
            <span>{t("common.tryAgain")}</span>
          </Button>
        </div>
      ) : (
        /* --- Case 3: Hiển thị đầy đủ theo Subpage / Tabs --- */
        <>
          {(() => {
            const { activeSessionsCount, turnoutRate } = calculateGroupMetrics(sessions, group);
            return (
              <>
                <SlideIn>
                  <GroupHeader
                    group={group}
                    sessionsCount={activeSessionsCount}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    onOpenInvite={() => setIsInviteModalOpen(true)}
                    onOpenCreateCalendar={canCreateCalendar ? () => setIsCreateCalendarOpen(true) : null}
                  />
                </SlideIn>

                {/* Subpage 1: Calendars / Planning Sessions */}
                {/* Mobile: thống kê lên trước danh sách lịch trình (order-first) */}
                {activeTab === "calendars" && (
                  <div className="flex flex-col">
                    <SlideIn key="calendars" index={1}>
                      <GroupSessions
                        sessions={sessions}
                        onOpenCreateModal={canCreateCalendar ? () => setIsCreateCalendarOpen(true) : null}
                        canManage={canCreateCalendar}
                        onChanged={refreshGroup}
                      />
                    </SlideIn>
                    <div className="max-sm:order-first">
                    <SlideIn index={2}>
                      <GroupMetricsBar
                        activeSessionsCount={activeSessionsCount}
                        turnoutRate={turnoutRate}
                        medianResponseHours={group?.medianResponseHours ?? null}
                      />
                    </SlideIn>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* Subpage 2: Members */}
          {activeTab === "members" && (
            <SlideIn key="members" index={1}>
              <GroupMembers
                group={group}
                onOpenInvite={() => setIsInviteModalOpen(true)}
              />
            </SlideIn>
          )}

          {/* Subpage 3: Settings */}
          {activeTab === "settings" && (
            <SlideIn key="settings" index={1}>
              <GroupSettings group={group} onChanged={refreshGroup} />
            </SlideIn>
          )}

          {/* Modal Mời Thành Viên - Dùng chung cấp Group */}
          <InviteMembersModal
            open={isInviteModalOpen}
            onOpenChange={setIsInviteModalOpen}
            group={group}
          />

          {/* Mobile: nút Tạo lịch trình ghim đáy. Phải nằm NGOÀI SlideIn: transform của hiệu ứng làm
              position:fixed neo theo khối đang trượt nên nút hiện ở trên rồi mới nhảy xuống đáy. */}
          {canCreateCalendar && (
          <BodyPortal>
          <Button
            onClick={() => setIsCreateCalendarOpen(true)}
            className="fixed inset-x-4 bottom-4 z-40 h-12 justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-medium text-white shadow-lg hover:bg-indigo-700 sm:hidden"
          >
            <CalendarPlus size={16} className="shrink-0" />
            <span>{t("groupDetail.createCalendar")}</span>
          </Button>
          </BodyPortal>
          )}

          {/* Modal Tạo Lịch Trình - Dùng chung cấp Group & Empty State */}
          <CreateCalendarModal
            open={isCreateCalendarOpen}
            onOpenChange={setIsCreateCalendarOpen}
            groupId={group?.id}
            onSubmit={createCalendar}
            isSubmitting={isCreatingCalendar}
          />
        </>
      )}
    </div>
  );
}

export default Group;
