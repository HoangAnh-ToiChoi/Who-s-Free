import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  getMondayOfWeek,
  calculateWeekDates,
  formatWeekRangeLabel,
  parseISODate,
} from "~/utils/dateUtils";

/**
 * Hook quản lý riêng biệt việc chuyển mốc thời gian ngày tháng (Google Calendar Navigation)
 * Chỉ tập trung vào một nhiệm vụ: Điều hướng tuần, tính toán ngày động.
 * Dùng chung cho cả MemberMatrix và LeadMatrix.
 * startDate ("YYYY-MM-DD", ngày bắt đầu khảo sát của phiên): mở đúng tuần chứa ngày đó; phiên cũ không có → tuần hiện tại.
 */
export function useWeekNavigation(startDate = null) {
  const anchorMonday = () => getMondayOfWeek(startDate ? parseISODate(startDate) : new Date());
  const [currentMonday, setCurrentMonday] = useState(anchorMonday);
  // Session thường tải xong sau lần render đầu → khi startDate đổi thì nhảy tới tuần đó (cập nhật ngay trong render, không cần effect).
  const [seenStartDate, setSeenStartDate] = useState(startDate);
  if (startDate !== seenStartDate) {
    setSeenStartDate(startDate);
    if (startDate) setCurrentMonday(anchorMonday());
  }

  // 7 ngày trong tuần được tự động tính toán
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || i18n.language;
  const weekDays = useMemo(() => calculateWeekDates(currentMonday, lang), [currentMonday, lang]);

  // Tiêu đề khoảng tuần (ví dụ: "Sep 28 – Oct 4, 2026")
  const weekLabel = useMemo(() => formatWeekRangeLabel(currentMonday, lang), [currentMonday, lang]);

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
  // Số tuần so với tuần hiện tại: 0 = tuần này, >0 = các tuần sau, <0 = các tuần trước
  const weekOffset = useMemo(
    () => Math.round((currentMonday - getMondayOfWeek(new Date())) / (7 * 24 * 60 * 60 * 1000)),
    [currentMonday]
  );

  const goToToday = useCallback(() => {
    setCurrentMonday(getMondayOfWeek(new Date()));
  }, []);

  return {
    currentMonday,
    weekDays,
    weekLabel,
    weekOffset,
    goToPrevWeek,
    goToNextWeek,
    goToToday,
  };
}

export default useWeekNavigation;
