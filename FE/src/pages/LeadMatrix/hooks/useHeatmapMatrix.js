import { useMemo } from "react";
import { START_HOUR, END_HOUR } from "~/utils/timeUtils";
import { hasResponded } from "~/utils/members";

/**
 * useHeatmapMatrix - Ma trận mật độ rảnh (heatmap) của tuần đang xem cho LeadMatrix, khối 30 phút.
 * Luôn tính cả nhóm (members từ useSessionMembers); dải xem thành viên không lọc ma trận.
 *
 * @param {Array} members - mọi thành viên nhóm kèm slots
 * @param {Array} weekDays - các ngày của tuần đang xem
 * @returns {{ matrix, totalMembers, getCell }}
 */
export function useHeatmapMatrix(members = [], weekDays = []) {
  // API trả cả người chưa nhập lịch (slots rỗng): mẫu số của heatmap chỉ tính người đã nhập lịch như trước
  const totalMembers = members.filter(hasResponded).length;

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
    members.forEach((member) => {
      (member.slots || []).forEach((slot) => {
        let targetDayIndex = -1;
        if (slot.dateStr && weekDays && weekDays.length > 0) {
          const matchDay = weekDays.find((d) => d.dateStr === slot.dateStr);
          // Ngày ngoài khoảng khảo sát không tính vào heatmap/gợi ý (slot cũ còn sót lại)
          if (matchDay && matchDay.inWindow !== false) {
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
              // Ghi chú của member cho slot này + khung giờ gốc (1 slot trải nhiều ô 30 phút)
              note: slot.note || "",
              slotStart: slot.startMinutes,
              slotEnd: slot.endMinutes,
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
  }, [members, totalMembers, weekDays]);

  // Helper: lấy dữ liệu 1 ô
  const getCell = (dayIndex, blockStartMinutes) => {
    return matrix[dayIndex]?.[blockStartMinutes] || { count: 0, members: [], percent: 0 };
  };

  return {
    matrix,
    totalMembers,
    getCell,
  };
}

export default useHeatmapMatrix;
