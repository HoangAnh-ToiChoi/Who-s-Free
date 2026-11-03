import { useCallback } from "react";

/**
 * Cuộn ngang lưới lịch (mobile hiện 3/7 ngày) tới một ngày bất kỳ.
 * Độ rộng cột tính từ scrollWidth nên dùng chung được cho mọi lưới có cột giờ cố định bên trái.
 */
export default function useDayPager(scrollRef, { timeColumnWidth, dayCount = 7 }) {
  const scrollToDay = useCallback(
    (index, behavior = "smooth") => {
      const el = scrollRef.current;
      if (!el) return;
      const dayWidth = (el.scrollWidth - timeColumnWidth) / dayCount;
      if (dayWidth > 0) el.scrollTo({ left: index * dayWidth, behavior });
    },
    [scrollRef, timeColumnWidth, dayCount]
  );

  return { scrollToDay };
}
