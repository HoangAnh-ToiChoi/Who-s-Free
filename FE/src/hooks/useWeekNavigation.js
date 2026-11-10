import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  getMondayOfWeek,
  calculateWeekDates,
  formatWeekRangeLabel,
  parseISODate,
  toISODateString,
  isDateInWindow,
} from "~/utils/dateUtils";

const shiftWeek = (weeks) => (monday) => {
  const next = new Date(monday);
  next.setDate(monday.getDate() + weeks * 7);
  return next;
};

/** Hôm nay, kẹp vào khoảng khảo sát (hôm nay ngoài khoảng → ngày đầu/cuối gần nhất). */
function clampToWindow(startDate, endDate) {
  const today = toISODateString(new Date());
  if (startDate && today < startDate) return parseISODate(startDate);
  if (endDate && today > endDate) return parseISODate(endDate);
  return new Date();
}

/**
 * Điều hướng tuần dùng chung cho MemberMatrix và LeadMatrix.
 * startDate/endDate ("YYYY-MM-DD"): khoảng khảo sát của phiên. Có khoảng → mở tuần chứa ngày bắt đầu, khoá lùi/tiến
 * ra ngoài khoảng, đánh dấu từng ngày `inWindow`; nút giữa về tuần hiện tại (kẹp vào khoảng).
 * Phiên cũ không có ngày → hành vi như trước (tuần hiện tại, không giới hạn).
 */
export function useWeekNavigation({ startDate = null, endDate = null } = {}) {
  const anchorMonday = () => getMondayOfWeek(startDate ? parseISODate(startDate) : new Date());
  const [currentMonday, setCurrentMonday] = useState(anchorMonday);
  // Session thường tải xong sau lần render đầu → khi startDate đổi thì nhảy tới tuần đó (cập nhật ngay trong render, không cần effect).
  const [seenStartDate, setSeenStartDate] = useState(startDate);
  if (startDate !== seenStartDate) {
    setSeenStartDate(startDate);
    if (startDate) setCurrentMonday(anchorMonday());
  }

  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || i18n.language;
  const weekDays = useMemo(
    () =>
      calculateWeekDates(currentMonday, lang).map((day) => ({
        ...day,
        inWindow: isDateInWindow(day.dateStr, startDate, endDate),
      })),
    [currentMonday, lang, startDate, endDate]
  );
  const weekLabel = useMemo(() => formatWeekRangeLabel(currentMonday, lang), [currentMonday, lang]);

  // Số tuần so với tuần hiện tại: 0 = tuần này, >0 = các tuần sau, <0 = các tuần trước
  const weekOffset = Math.round((currentMonday - getMondayOfWeek(new Date())) / (7 * 24 * 60 * 60 * 1000));

  const goToPrevWeek = useCallback(() => setCurrentMonday(shiftWeek(-1)), []);
  const goToNextWeek = useCallback(() => setCurrentMonday(shiftWeek(1)), []);
  const goToToday = useCallback(
    () => setCurrentMonday(getMondayOfWeek(clampToWindow(startDate, endDate))),
    [startDate, endDate]
  );

  // Props cho WeekNav (‹ Tuần này ›)
  const weekNav = {
    onPrevWeek: goToPrevWeek,
    onNextWeek: goToNextWeek,
    onToday: goToToday,
    weekOffset,
    canGoPrev: !startDate || weekDays[0].dateStr > startDate,
    canGoNext: !endDate || weekDays[6].dateStr < endDate,
  };

  return { currentMonday, weekDays, weekLabel, weekNav };
}

export default useWeekNavigation;
