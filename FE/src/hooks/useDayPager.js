import { useCallback, useEffect, useState } from "react";

/**
 * Theo dõi cột ngày đầu tiên đang hiện trong khung cuộn ngang của lưới lịch (mobile hiện 3/7 ngày)
 * để dải chọn ngày tô đúng, và cho phép nhảy tới một ngày bất kỳ.
 * Độ rộng cột tính từ scrollWidth nên dùng chung được cho mọi lưới có cột giờ cố định bên trái.
 */
export default function useDayPager(scrollRef, { timeColumnWidth, dayCount = 7 }) {
  const [firstVisible, setFirstVisible] = useState(0);

  const getDayWidth = useCallback(() => {
    const el = scrollRef.current;
    return el ? (el.scrollWidth - timeColumnWidth) / dayCount : 0;
  }, [scrollRef, timeColumnWidth, dayCount]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;

    let frame = 0;
    const handleScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const dayWidth = getDayWidth();
        if (dayWidth > 0) setFirstVisible(Math.round(el.scrollLeft / dayWidth));
      });
    };

    handleScroll();
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", handleScroll);
    };
  }, [scrollRef, getDayWidth]);

  const scrollToDay = useCallback(
    (index, behavior = "smooth") => {
      const el = scrollRef.current;
      const dayWidth = getDayWidth();
      if (el && dayWidth > 0) el.scrollTo({ left: index * dayWidth, behavior });
    },
    [scrollRef, getDayWidth]
  );

  return { firstVisible, scrollToDay };
}
