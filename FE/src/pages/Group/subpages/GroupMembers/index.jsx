import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Users, UserPlus, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { groupService } from "~/service/groupService/groupService";
import { GROUP_MEMBERS_CHANGED_EVENT } from "~/events/groupEvents";
import MemberCard from "./components/MemberCard";

/**
 * GroupMembers - Subpage hiển thị danh sách thành viên thực tế của nhóm từ Backend API
 *
 * Tách biệt rõ ràng 4 trạng thái:
 *   1. Loading: Skeleton giả lập
 *   2. Error: Thông báo lỗi trực quan kèm nút Thử lại
 *   3. Empty: Trạng thái rỗng khi chưa có thành viên
 *   4. Data: Grid danh sách thành viên với ảnh, tên và nhãn Lead
 */
function GroupMembers({ group, onOpenInvite }) {
  const { t } = useTranslation();
  const groupId = group?.id;
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestControllerRef = useRef(null);
  const displayedMemberCount = isLoading || error
    ? (group?.memberCount ?? "—")
    : members.length;
  const normalizedUserRole = (group?.userRole || group?.role || "").toLowerCase();
  const canInvite = normalizedUserRole === "owner" || normalizedUserRole === "lead";

  const loadMembers = useCallback(async () => {
    requestControllerRef.current?.abort();
    if (!groupId) {
      setMembers([]);
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    requestControllerRef.current = controller;
    try {
      setIsLoading(true);
      setError(null);
      const data = await groupService.getMembers(groupId, { signal: controller.signal });
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      if (controller.signal.aborted || err.name === "AbortError") return;
      console.error("Failed to load group members:", err);
      setMembers([]);
      setError(
        err?.message ||
          t("groupDetail.errorLoadMembers", {
            defaultValue: "Đã xảy ra lỗi khi kết nối tới máy chủ. Vui lòng thử lại.",
          })
      );
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
        setIsLoading(false);
      }
    }
  }, [groupId, t]);

  useEffect(() => {
    let isActive = true;
    const handleMembersChanged = (event) => {
      if (event.detail?.groupId === groupId) loadMembers();
    };

    window.addEventListener(GROUP_MEMBERS_CHANGED_EVENT, handleMembersChanged);
    queueMicrotask(() => {
      if (isActive) loadMembers();
    });

    return () => {
      isActive = false;
      requestControllerRef.current?.abort();
      window.removeEventListener(GROUP_MEMBERS_CHANGED_EVENT, handleMembersChanged);
    };
  }, [groupId, loadMembers]);

  return (
    <div className="mt-8 space-y-6">
      {/* Header section with count & Invite button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            {t("groupDetail.tabMembers")}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {displayedMemberCount} / {group?.capacity ?? "—"} {t("groupCard.members")}
          </p>
        </div>

        {canInvite && (
          <Button
            type="button"
            onClick={onOpenInvite}
            className="gap-2 bg-indigo-600 px-4 py-2 font-medium text-white shadow-xs hover:bg-indigo-700 cursor-pointer h-9 text-xs rounded-xl"
          >
            <UserPlus size={14} />
            <span>{t("groupDetail.inviteMembers")}</span>
          </Button>
        )}
      </div>

      {/* 1. Trạng thái Loading (Skeleton) */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white p-4"
            />
          ))}
        </div>
      ) : error ? (
        /* 2. Trạng thái Lỗi API: Hiển thị thông điệp lỗi và nút Thử lại */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/50 p-8 text-center shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertCircle size={24} />
          </div>
          <h3 className="mt-4 text-base font-semibold text-rose-900">
            {t("groupDetail.errorLoadMembersTitle", {
              defaultValue: "Không thể tải danh sách thành viên",
            })}
          </h3>
          <p className="mt-1 max-w-md text-sm text-rose-600">
            {error}
          </p>
          <Button
            variant="outline"
            onClick={() => loadMembers()}
            className="mt-4 gap-2 border-rose-300 text-rose-700 hover:bg-rose-100 cursor-pointer h-9 min-w-[100px] justify-center"
          >
            <RefreshCw size={14} />
            <span>{t("common.tryAgain")}</span>
          </Button>
        </div>
      ) : members.length > 0 ? (
        /* 3. Trạng thái Thành công: Grid thẻ thành viên */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      ) : (
        /* 4. Trạng thái Rỗng: Chưa có thành viên */
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
          <Users size={28} className="mx-auto text-slate-400" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900">
            {t("groupDetail.noMembersTitle", { defaultValue: "Chưa có thành viên nào" })}
          </h3>
        </div>
      )}
    </div>
  );
}

export default GroupMembers;
