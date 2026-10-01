import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import http from "~/utils/http";

function formatMinutes(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * useOptimalAnalysis - Custom hook tính toán bảng xếp hạng khung giờ vàng & xung đột
 * Tự động tính toán thời gian thực từ ma trận Heatmap (matrix, weekDays, totalMembers, allMembers).
 * Có fallback tải từ REST API (/optimalSlots, /conflictSlots) nếu chưa có ma trận.
 */
export function useOptimalAnalysis({
  matrix,
  weekDays,
  totalMembers = 1,
  allMembers = [],
} = {}) {
  const { t } = useTranslation();
  const [apiOptimal, setApiOptimal] = useState([]);
  const [apiConflicts, setApiConflicts] = useState([]);

  // Tải dữ liệu dự phòng từ db.json nếu không truyền ma trận
  useEffect(() => {
    if (matrix && weekDays) return;
    let isMounted = true;
    async function loadAnalysis() {
      try {
        const [opts, confs] = await Promise.all([
          http.get("/optimalSlots").catch(() => []),
          http.get("/conflictSlots").catch(() => []),
        ]);
        if (isMounted) {
          if (Array.isArray(opts)) setApiOptimal(opts);
          if (Array.isArray(confs)) setApiConflicts(confs);
        }
      } catch (err) {
        console.warn("Could not load optimal/conflict slots from db.json:", err);
      }
    }
    loadAnalysis();
    return () => {
      isMounted = false;
    };
  }, [matrix, weekDays]);

  // Phân tích ma trận thời gian thực
  const { dynamicOptimal, dynamicConflicts } = useMemo(() => {
    if (!matrix || !weekDays || weekDays.length === 0) {
      return { dynamicOptimal: [], dynamicConflicts: [] };
    }

    const intervals = [];

    weekDays.forEach((day) => {
      const dayData = matrix[day.dayIndex] || {};
      const blocks = Object.keys(dayData)
        .map(Number)
        .sort((a, b) => a - b);

      let current = null;

      blocks.forEach((b) => {
        const cell = dayData[b];
        const count = cell?.count || 0;

        if (count > 0) {
          if (current && current.count === count && current.endMin === b) {
            current.endMin = b + 30;
          } else {
            if (current) intervals.push(current);
            current = {
              dayIndex: day.dayIndex,
              dayName: day.dayName || `Thứ ${day.dayIndex + 2}`,
              dateStr: day.dateStr,
              startMin: b,
              endMin: b + 30,
              count,
              percent: cell.percent || Math.round((count / Math.max(1, totalMembers)) * 100),
              members: cell.members || [],
            };
          }
        } else {
          if (current) {
            intervals.push(current);
            current = null;
          }
        }
      });

      if (current) {
        intervals.push(current);
      }
    });

    if (intervals.length === 0) {
      return { dynamicOptimal: [], dynamicConflicts: [] };
    }

    // 1. Khung giờ tối ưu: Sắp xếp theo % tham gia giảm dần, độ dài thời gian giảm dần
    const sortedOptimal = [...intervals].sort((a, b) => {
      if (b.percent !== a.percent) return b.percent - a.percent;
      return (b.endMin - b.startMin) - (a.endMin - a.startMin);
    });

    const optResults = sortedOptimal.slice(0, 3).map((item, idx) => {
      const timeLabel = `${item.dayName}, ${formatMinutes(item.startMin)} – ${formatMinutes(item.endMin)}`;
      const memberNames = item.members.map((m) => m.name).join(", ");
      return {
        id: `opt-${item.dayIndex}-${item.startMin}`,
        dayIndex: item.dayIndex,
        blockStart: item.startMin,
        dayName: item.dayName,
        rank: `#${idx + 1}`,
        timeLabel,
        badge: item.percent === 100 ? t("leadMatrix.allPresent") : `${item.percent}% Quorum`,
        badgeType: item.percent === 100 ? "best" : item.percent >= 70 ? "quorum" : "lunch",
        description: t("leadMatrix.availableMembersDesc", {
          count: item.count,
          total: totalMembers,
          names: memberNames || "Thành viên",
        }),
      };
    });

    // 2. Vùng xung đột: Các khung giờ có người rảnh nhưng không đủ thành viên (count < totalMembers)
    const sortedConflicts = intervals
      .filter((item) => item.count < totalMembers && item.count > 0)
      .sort((a, b) => {
        const missingA = totalMembers - a.count;
        const missingB = totalMembers - b.count;
        if (missingB !== missingA) return missingB - missingA;
        return (b.endMin - b.startMin) - (a.endMin - a.startMin);
      });

    const confResults = sortedConflicts.slice(0, 3).map((item) => {
      const timeLabel = `${item.dayName}, ${formatMinutes(item.startMin)} – ${formatMinutes(item.endMin)}`;
      const presentNames = item.members.map((m) => m.name).join(", ");
      const missingMembers = allMembers.filter(
        (m) => !item.members.some((im) => im.id === (m.memberId || m.id))
      );
      const missingNames = missingMembers.map((m) => m.memberName || m.name).join(", ");
      const missingCount = totalMembers - item.count;

      return {
        id: `conf-${item.dayIndex}-${item.startMin}`,
        dayIndex: item.dayIndex,
        blockStart: item.startMin,
        dayName: item.dayName,
        timeLabel,
        badge: t("leadMatrix.onlyCountAvailable", {
          count: item.count,
          total: totalMembers,
          defaultValue: `Chỉ ${item.count}/${totalMembers} rảnh`,
        }),
        badgeType: "limited",
        description: t("leadMatrix.missingMembersDesc", {
          count: item.count,
          total: totalMembers,
          names: missingNames || "thành viên khác",
        }),
      };
    });

    return { dynamicOptimal: optResults, dynamicConflicts: confResults };
  }, [matrix, weekDays, totalMembers, allMembers, t]);

  const optimalSlots = matrix && weekDays ? dynamicOptimal : apiOptimal;
  const conflictSlots = matrix && weekDays ? dynamicConflicts : apiConflicts;

  return {
    optimalSlots,
    conflictSlots,
  };
}

export default useOptimalAnalysis;
