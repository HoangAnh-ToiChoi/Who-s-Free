import { useState, useMemo, useCallback, useEffect } from "react";
import { calendarService } from "~/service/calendarService/calendarService";

/**
 * useMemberFilter - Hook quản lý lọc thành viên cho LeadMatrix
 * Tự động tải danh sách thành viên thực tế từ db.json theo sessionId.
 *
 * Hỗ trợ 3 chế độ lọc:
 * 1. All — Hiển thị tất cả thành viên
 * 2. Leadership — Chỉ hiển thị leadership (Lead Admin, Vice Lead)
 * 3. Core — Chỉ hiển thị thành viên core
 * 4. Custom — Bấm chọn/bỏ chọn từng member riêng lẻ
 */
export function useMemberFilter(sessionId = "sess-1") {
  const [activePreset, setActivePreset] = useState("all");
  const [allMembers, setAllMembers] = useState([]);
  const [customSelectedIds, setCustomSelectedIds] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function loadMembers() {
      try {
        const avails = await calendarService.getSessionAvailabilities(sessionId);
        if (isMounted && Array.isArray(avails) && avails.length > 0) {
          setAllMembers(avails);
          setCustomSelectedIds(avails.map((m) => m.memberId));
        }
      } catch (err) {
        console.warn("Could not load member filter availabilities:", err);
      }
    }
    loadMembers();
    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  // Danh sách member ID đã lọc
  const selectedMemberIds = useMemo(() => {
    switch (activePreset) {
      case "leadership":
        return allMembers
          .filter((m) => m.groupRole === "leadership")
          .map((m) => m.memberId);
      case "core":
        return allMembers
          .filter((m) => m.groupRole === "core" || m.groupRole === "leadership")
          .map((m) => m.memberId);
      case "custom":
        return customSelectedIds;
      case "all":
      default:
        return allMembers.map((m) => m.memberId);
    }
  }, [activePreset, allMembers, customSelectedIds]);

  // Chuyển preset filter
  const setPreset = useCallback((preset) => {
    setActivePreset(preset);
  }, []);

  // Chọn/bỏ chọn 1 member ở custom mode
  const toggleMember = useCallback((memberId) => {
    setActivePreset("custom");
    setCustomSelectedIds((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      }
      return [...prev, memberId];
    });
  }, []);

  return {
    activePreset,
    selectedMemberIds,
    allMembers,
    setPreset,
    toggleMember,
  };
}

export default useMemberFilter;
