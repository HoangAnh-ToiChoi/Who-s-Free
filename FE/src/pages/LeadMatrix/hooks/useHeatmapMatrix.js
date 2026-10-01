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
export function useHeatmapMatrix(
  selectedMemberIds = [],
  sessionId,
  weekDays = []
) {
  const [sessionMembers, setSessionMembers] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function loadHeatmapData() {
      if (!sessionId) {
        setSessionMembers([]);
        return;
      }
      try {
        const avails = await calendarService.getSessionAvailabilities(sessionId);
        if (isMounted && Array.isArray(avails)) {
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

    // Đổ dữ liệu availability vào ma trận (chỉ hiển thị slot thuộc tuần đang xem)
    filteredMembers.forEach((member) => {
      (member.slots || []).forEach((slot) => {
        let targetDayIndex = -1;
        if (slot.dateStr && weekDays && weekDays.length > 0) {
          const matchDay = weekDays.find((d) => d.dateStr === slot.dateStr);
          if (matchDay) {
            targetDayIndex = matchDay.dayIndex;
          }
        } else if (slot.dayIndex >= 0 && slot.dayIndex <= 6) {
          targetDayIndex = slot.dayIndex;
        }

        if (targetDayIndex < 0 || targetDayIndex > 6) return;

        // Duyệt qua từng block 30 phút trong khoảng slot
        for (let t = slot.startMinutes; t < slot.endMinutes; t += 30) {
          const blockStart = Math.floor(t / 30) * 30;
          if (result[targetDayIndex] && result[targetDayIndex][blockStart]) {
            result[targetDayIndex][blockStart].count += 1;
            result[targetDayIndex][blockStart].members.push({
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
  }, [filteredMembers, totalMembers, weekDays]);

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
