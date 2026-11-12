import { useEffect, useMemo, useState } from "react";
import { availabilityService as calendarService } from "~/service/availabilityService/availabilityService";
import { isNarrowScreen } from "~/utils/viewport";
import { hasResponded } from "~/utils/members";

const isLeader = (member) => member.role === "owner" || member.role === "lead";

/**
 * useSessionMembers - Thành viên của phiên cho màn Lead (API trả MỌI thành viên nhóm, người chưa nhập lịch có slots rỗng).
 * - members: dùng cho heatmap / gợi ý — luôn là cả nhóm.
 * - view + visibleMembers: dải xem thành viên ("all" | "leadership"), CHỈ để xem, không ảnh hưởng lưới.
 *   Điện thoại mặc định xem Ban lãnh đạo (màn hẹp), máy tính mặc định Tất cả.
 * - respondedMembers / pendingMembers: đã / chưa nhập lịch (cột bên phải).
 */
export function useSessionMembers(sessionId) {
  const [view, setView] = useState(() => (isNarrowScreen() ? "leadership" : "all"));
  const [members, setMembers] = useState(() => calendarService.peekSessionAvailabilities(sessionId) ?? []);

  useEffect(() => {
    if (!sessionId) return undefined;
    let isMounted = true;
    calendarService
      .getSessionAvailabilities(sessionId)
      .then((avails) => isMounted && Array.isArray(avails) && setMembers(avails))
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  const visibleMembers = useMemo(
    () => (view === "leadership" ? members.filter(isLeader) : members),
    [view, members]
  );
  const [respondedMembers, pendingMembers] = useMemo(
    () => [members.filter(hasResponded), members.filter((m) => !hasResponded(m))],
    [members]
  );

  return { view, setView, members, visibleMembers, respondedMembers, pendingMembers };
}

export default useSessionMembers;
