import { useState, useEffect } from "react";

/**
 * useScrollbarGutter - Đo độ rộng chính xác của thanh cuộn trên mọi hệ điều hành
 * Giúp Header và Body bảng/lưới thẳng hàng 100%, không bị lệch cột trên Windows / macOS.
 * Sử dụng được cho AvailabilityGrid, LeadMatrix, Table view...
 */
export function useScrollbarGutter(scrollRef, initialGutter = 15) {
  const [gutter, setGutter] = useState(initialGutter);

  useEffect(() => {
    const updateGutter = () => {
      if (scrollRef?.current) {
        const el = scrollRef.current;
        const diff = el.offsetWidth - el.clientWidth;
        setGutter(Math.max(0, diff));
      }
    };

    updateGutter();
    window.addEventListener("resize", updateGutter);
    return () => window.removeEventListener("resize", updateGutter);
  }, [scrollRef]);

  return gutter;
}

export default useScrollbarGutter;
