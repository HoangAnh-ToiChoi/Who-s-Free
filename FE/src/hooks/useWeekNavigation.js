import { useState, useMemo, useCallback } from "react";
import {
  getMondayOfWeek,
  calculateWeekDates,
  formatWeekRangeLabel,
} from "~/utils/dateUtils";

/**
 * Hook quản lý riêng biệt việc chuyển mốc thời gian ngày tháng (Google Calendar Navigation)
 * Chỉ tập trung vào một nhiệm vụ: Điều hướng tuần, tính toán ngày động.
 * Dùng chung cho cả MemberMatrix và LeadMatrix.
 */
export function useWeekNavigation(initialDate = new Date()) {
  const [currentMonday, setCurrentMonday] = useState(() => getMondayOfWeek(initialDate));

  // 7 ngày trong tuần được tự động tính toán
  const weekDays = useMemo(() => calculateWeekDates(currentMonday), [currentMonday]);

  // Tiêu đề khoảng tuần (ví dụ: "Sep 28 – Oct 4, 2026")
  const weekLabel = useMemo(() => formatWeekRangeLabel(currentMonday), [currentMonday]);

  // Lùi 1 tuần (-7 ngày)
  const goToPrevWeek = useCallback(() => {
    setCurrentMonday((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - 7);
      return next;
    });
  }, []);

  // Tiến 1 tuần (+7 ngày)
  const goToNextWeek = useCallback(() => {
    setCurrentMonday((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 7);
      return next;
    });
  }, []);

  // Trở về tuần hiện tại (Today)
  const goToToday = useCallback(() => {
    setCurrentMonday(getMondayOfWeek(new Date()));
  }, []);

  return {
    currentMonday,
    weekDays,
    weekLabel,
    goToPrevWeek,
    goToNextWeek,
    goToToday,
  };
}

export default useWeekNavigation;
