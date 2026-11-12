import { useState, useMemo, useCallback, useEffect } from "react";
import { availabilityService as calendarService } from "~/service/availabilityService/availabilityService";
import { isNarrowScreen } from "~/utils/viewport";
import { hasResponded } from "~/utils/members";

const isLeader = (member) => member.role === "owner" || member.role === "lead";
// Điện thoại mặc định xem Ban lãnh đạo (màn hẹp, thanh lọc chỉ hiện owner/lead); máy tính mặc định Tất cả
const defaultPreset = () => (isNarrowScreen() ? "leadership" : "all");

/**
 * useMemberFilter - Lọc thành viên cho LeadMatrix. API trả về MỌI thành viên nhóm (người chưa nhập lịch có slots rỗng).
 *
 * 3 chế độ:
 * 1. all — tất cả thành viên
 * 2. leadership — chỉ owner/lead (vai trò thật trong nhóm); các thành viên khác bị ẨN khỏi thanh lọc, không làm mờ
 * 3. custom — bấm chọn/bỏ chọn từng người (người bị bỏ chọn vẫn hiện, làm mờ, để bấm chọn lại)
 *
 * Trả thêm: visibleMembers (thành viên hiện trên thanh lọc theo chế độ), respondedMembers / pendingMembers
 * (đã / chưa nhập lịch — cột "Đã chọn lịch / Chưa chọn lịch" bên phải).
 */
export function useMemberFilter(sessionId) {
  const [activePreset, setActivePreset] = useState(defaultPreset);
  const [allMembers, setAllMembers] = useState(() => calendarService.peekSessionAvailabilities(sessionId) ?? []);
  const [customSelectedIds, setCustomSelectedIds] = useState(() =>
    (calendarService.peekSessionAvailabilities(sessionId) ?? []).map((m) => m.memberId)
  );

  useEffect(() => {
    let isMounted = true;
    if (!sessionId) return undefined;
    calendarService
      .getSessionAvailabilities(sessionId)
      .then((avails) => {
        if (!isMounted || !Array.isArray(avails)) return;
        setAllMembers(avails);
        setCustomSelectedIds(avails.map((m) => m.memberId));
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  const visibleMembers = useMemo(
    () => (activePreset === "leadership" ? allMembers.filter(isLeader) : allMembers),
    [activePreset, allMembers]
  );

  const selectedMemberIds = useMemo(() => {
    if (activePreset === "custom") return customSelectedIds;
    return visibleMembers.map((m) => m.memberId);
  }, [activePreset, visibleMembers, customSelectedIds]);

  const [respondedMembers, pendingMembers] = useMemo(
    () => [allMembers.filter(hasResponded), allMembers.filter((m) => !hasResponded(m))],
    [allMembers]
  );

  const setPreset = useCallback((preset) => {
    setActivePreset(preset);
    if (preset === "all") setCustomSelectedIds(allMembers.map((m) => m.memberId));
  }, [allMembers]);

  // Chọn/bỏ chọn 1 người: bắt đầu từ những người đang được chọn của chế độ hiện tại
  const toggleMember = useCallback(
    (memberId) => {
      setCustomSelectedIds((prev) => {
        const base = activePreset === "custom" ? prev : selectedMemberIds;
        return base.includes(memberId) ? base.filter((id) => id !== memberId) : [...base, memberId];
      });
      setActivePreset("custom");
    },
    [activePreset, selectedMemberIds]
  );

  return {
    activePreset,
    selectedMemberIds,
    allMembers,
    visibleMembers,
    respondedMembers,
    pendingMembers,
    setPreset,
    toggleMember,
  };
}

export default useMemberFilter;
