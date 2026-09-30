/**
 * matrixCalculations.js - Module tính toán công thức thực tế cho Ma trận & Thống kê
 *
 * Nhiệm vụ:
 * 1. Tính toán khung giờ có mật độ trùng rảnh cao nhất (highestOverlapText).
 * 2. Tính biểu đồ 5 thanh cột mức độ trùng theo các ngày trong tuần (sparkline).
 * 3. Tính số lượng thành viên đã phản hồi (respondedCount) và tỷ lệ tham gia (quorumPercent).
 * 4. Tính toán tỷ lệ tham gia trung bình toàn nhóm (turnoutRate) và số lịch đang mở (activeSessionsCount).
 */

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Tính toán số liệu thống kê chi tiết cho một session dựa trên danh sách availability thực tế của các thành viên.
 *
 * @param {Object} session - Dữ liệu session hiện tại
 * @param {Array} availabilities - Danh sách availability của các thành viên trong session
 * @param {number} fallbackTotalMembers - Số lượng thành viên mặc định nếu session chưa có
 * @returns {Object} { respondedCount, quorumPercent, highestOverlapText, sparkline }
 */
export function calculateSessionMetrics(session, availabilities = [], fallbackTotalMembers = 12) {
  const totalMembers = session?.totalMembers || fallbackTotalMembers || 12;

  // 1. Số người đã phản hồi (có ít nhất 1 slot rảnh)
  const respondedAvails = (availabilities || []).filter(
    (a) => a && Array.isArray(a.slots) && a.slots.length > 0
  );
  const respondedCount = respondedAvails.length;

  // 2. Tỷ lệ % Quorum thực tế
  const quorumPercent =
    totalMembers > 0 ? Math.min(100, Math.round((respondedCount / totalMembers) * 100)) : 0;

  // 3. Phân bổ đếm số người rảnh theo từng block 30 phút (0:00 -> 23:30) cho 7 ngày
  const dayBlockCounts = Array.from({ length: 7 }, () => ({}));
  let maxCount = 0;
  let bestDayIndex = 0;
  let bestStartMin = 600; // 10:00
  let bestEndMin = 660; // 11:00

  respondedAvails.forEach((member) => {
    (member.slots || []).forEach((slot) => {
      const d = slot.dayIndex;
      if (typeof d !== "number" || d < 0 || d > 6) return;

      const start = Math.max(0, slot.startMinutes || 0);
      const end = Math.min(1440, slot.endMinutes || 0);

      for (let t = start; t < end; t += 30) {
        const block = Math.floor(t / 30) * 30;
        dayBlockCounts[d][block] = (dayBlockCounts[d][block] || 0) + 1;
      }
    });
  });

  // Tìm block và dải thời gian liên tục có số người rảnh cao nhất
  for (let d = 0; d < 7; d++) {
    const blocks = Object.keys(dayBlockCounts[d])
      .map(Number)
      .sort((a, b) => a - b);

    for (const b of blocks) {
      const cnt = dayBlockCounts[d][b];
      if (cnt > maxCount) {
        maxCount = cnt;
        bestDayIndex = d;
        bestStartMin = b;

        // Mở rộng các block liên tiếp có cùng số lượng người rảnh tối đa
        let cur = b + 30;
        while (dayBlockCounts[d][cur] === cnt) {
          cur += 30;
        }
        bestEndMin = cur;
      }
    }
  }

  // 4. Định dạng chuỗi Highest Overlap Text
  let highestOverlapText = "";
  if (maxCount > 0) {
    const formatMin = (m) => {
      const hh = String(Math.floor(m / 60)).padStart(2, "0");
      const mm = String(m % 60).padStart(2, "0");
      return `${hh}:${mm}`;
    };
    highestOverlapText = `Highest overlap: ${DAY_NAMES[bestDayIndex]} ${formatMin(bestStartMin)} - ${formatMin(bestEndMin)} (${maxCount} available)`;
  } else {
    const pendingCount = Math.max(0, totalMembers - respondedCount);
    highestOverlapText = `Waiting for responses - ${pendingCount} pending`;
  }

  // 5. Tính toán Sparkline (5 ngày Mon..Fri tương ứng dayIndex 0..4)
  const sparkline = [0, 1, 2, 3, 4].map((d) => {
    const counts = Object.values(dayBlockCounts[d] || {});
    const dayPeak = counts.length > 0 ? Math.max(...counts) : 0;
    if (totalMembers > 0) {
      return Math.min(100, Math.max(15, Math.round((dayPeak / totalMembers) * 100)));
    }
    return 20;
  });

  return {
    respondedCount,
    quorumPercent,
    highestOverlapText,
    sparkline,
  };
}

/**
 * Tính toán số liệu thống kê cấp nhóm (Group Overview Metrics)
 *
 * @param {Array} sessions - Danh sách các session của nhóm
 * @param {Object} group - Dữ liệu nhóm hiện tại (fallback)
 * @returns {Object} { activeSessionsCount, turnoutRate }
 */
export function calculateGroupMetrics(sessions = [], group = null) {
  const activeSessions = (sessions || []).filter(
    (s) => s.status !== "archived" && s.status !== "cancelled"
  );
  const activeSessionsCount = activeSessions.length;

  let turnoutRate = group?.responseRate || 0;
  if (activeSessions.length > 0) {
    const sumQuorum = activeSessions.reduce(
      (acc, s) => acc + (typeof s.quorumPercent === "number" ? s.quorumPercent : 0),
      0
    );
    turnoutRate = Math.round(sumQuorum / activeSessions.length);
  }

  return {
    activeSessionsCount,
    turnoutRate,
  };
}

export default {
  calculateSessionMetrics,
  calculateGroupMetrics,
};
