import { useMemo } from "react";

/**
 * Slot thuộc tuần đang xem + thống kê tuần + tập ngày có slot (để dải ngày mobile hiện chấm).
 * Slot cũ không có dateStr (theo dayIndex) được coi là thuộc mọi tuần.
 */
export function useWeekSlots(slots, weekDays) {
  const currentWeekSlots = useMemo(
    () => slots.filter((s) => !s.dateStr || weekDays.some((w) => w.dateStr === s.dateStr)),
    [slots, weekDays]
  );

  const markedDates = useMemo(
    () => new Set(currentWeekSlots.map((s) => s.dateStr).filter(Boolean)),
    [currentWeekSlots]
  );

  const weekStats = useMemo(() => {
    const totalMinutes = currentWeekSlots.reduce(
      (acc, s) => acc + Math.max(0, s.endMinutes - s.startMinutes),
      0
    );
    const totalHours = (totalMinutes / 60).toFixed(1);
    return {
      count: currentWeekSlots.length,
      totalHours: totalHours.endsWith(".0") ? parseInt(totalHours, 10) : totalHours,
    };
  }, [currentWeekSlots]);

  return { currentWeekSlots, markedDates, weekStats };
}
