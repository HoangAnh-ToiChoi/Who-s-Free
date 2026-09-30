import { useState, useMemo, useEffect } from "react";
import { START_HOUR, END_HOUR } from "~/utils/timeUtils";
import { calendarService } from "~/service/calendarService/calendarService";

/**
 * useHeatmapMatrix - Hook tính toán ma trận mật độ rảnh (heatmap) cho LeadMatrix
 * Đọc dữ liệu availability thực tế từ db.json và băm block 30 phút theo công thức chuẩn.
 *
 * @param {string[]} selectedMemberIds - Danh sách member ID được chọn (filter)
 * @param {string} sessionId - ID của session hiện tại
 * @returns {{ matrix, totalMembers, getCell }}
 */
export function useHeatmapMatrix(selectedMemberIds = [], sessionId = "sess-1") {
  const [sessionMembers, setSessionMembers] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function loadHeatmapData() {
      try {
        const avails = await calendarService.getSessionAvailabilities(sessionId);
        if (isMounted && Array.isArray(avails) && avails.length > 0) {
          setSessionMembers(avails);
        }
      } catch (err) {
        console.warn("Could not load heatmap availabilities:", err);
      }
    }
    loadHeatmapData();
    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  const filteredMembers = useMemo(() => {
    if (!selectedMemberIds || selectedMemberIds.length === 0) {
      return sessionMembers;
    }
    return sessionMembers.filter((m) =>
      selectedMemberIds.includes(m.memberId)
    );
  }, [selectedMemberIds, sessionMembers]);

  const totalMembers = filteredMembers.length;

  // Tạo ma trận: 7 ngày x 48 block (30 phút) = 336 ô
  const matrix = useMemo(() => {
    const totalBlocks = (END_HOUR - START_HOUR + 1) * 2; // 48 blocks (0:00 -> 23:30)
    const result = {};

    // Khởi tạo ma trận trống
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      result[dayIndex] = {};
      for (let blockIdx = 0; blockIdx < totalBlocks; blockIdx++) {
        const blockStart = START_HOUR * 60 + blockIdx * 30;
        result[dayIndex][blockStart] = {
          count: 0,
          members: [],
          percent: 0,
        };
      }
    }

    // Đổ dữ liệu availability vào ma trận
    filteredMembers.forEach((member) => {
      (member.slots || []).forEach((slot) => {
        const { dayIndex, startMinutes, endMinutes } = slot;
        if (dayIndex < 0 || dayIndex > 6) return;

        // Duyệt qua từng block 30 phút trong khoảng slot
        for (let t = startMinutes; t < endMinutes; t += 30) {
          const blockStart = Math.floor(t / 30) * 30;
          if (result[dayIndex] && result[dayIndex][blockStart]) {
            result[dayIndex][blockStart].count += 1;
            result[dayIndex][blockStart].members.push({
              id: member.memberId,
              name: member.memberName,
              avatarUrl: member.avatarUrl,
              role: member.role,
            });
          }
        }
      });
    });

    // Tính phần trăm quorum
    if (totalMembers > 0) {
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        for (const blockStart of Object.keys(result[dayIndex])) {
          const cell = result[dayIndex][blockStart];
          cell.percent = Math.round((cell.count / totalMembers) * 100);
        }
      }
    }

    return result;
  }, [filteredMembers, totalMembers]);

  // Helper: lấy dữ liệu 1 ô
  const getCell = (dayIndex, blockStartMinutes) => {
    return matrix[dayIndex]?.[blockStartMinutes] || { count: 0, members: [], percent: 0 };
  };

  return {
    matrix,
    totalMembers,
    filteredMembers,
    getCell,
  };
}

export default useHeatmapMatrix;
