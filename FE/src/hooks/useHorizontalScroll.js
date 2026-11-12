import { useCallback, useEffect, useState } from "react";

const EDGE_EPSILON_PX = 2;

/**
 * Lăn chuột dọc → cuộn ngang `el`. Chỉ chặn cuộn trang khi `el` còn chỗ để cuộn theo hướng đó;
 * touchpad đang cuộn ngang sẵn thì để nguyên.
 */
export function wheelToHorizontal(e, el) {
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  const canScroll = e.deltaY > 0
    ? el.scrollLeft + el.clientWidth < el.scrollWidth - EDGE_EPSILON_PX
    : el.scrollLeft > EDGE_EPSILON_PX;
  if (!canScroll) return;
  e.preventDefault();
  el.scrollLeft += e.deltaY;
}

/**
 * Dải cuộn ngang (vd thành viên trên thanh lọc):
 * - Lăn chuột dọc khi con trỏ đang trên dải → cuộn ngang. Chỉ chặn cuộn trang khi dải còn chỗ để cuộn theo hướng đó,
 *   tới mép thì nhường lại cho trang cuộn như bình thường. Touchpad cuộn ngang sẵn thì giữ nguyên.
 * - Trả về atStart/atEnd để vẽ vùng mờ ở mép: còn nội dung bị khuất phía nào thì mép đó mờ dần, cuộn tới tận cùng thì hết mờ.
 * Gắn bằng `attach` (callback ref) để listener có ngay khi phần tử xuất hiện; ResizeObserver tự đo lần đầu khi bắt đầu theo dõi.
 */
export default function useHorizontalScroll() {
  const [el, setEl] = useState(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });

  const update = useCallback((node) => {
    if (!node) return;
    const atStart = node.scrollLeft <= EDGE_EPSILON_PX;
    const atEnd = node.scrollLeft + node.clientWidth >= node.scrollWidth - EDGE_EPSILON_PX;
    setEdges((prev) => (prev.atStart === atStart && prev.atEnd === atEnd ? prev : { atStart, atEnd }));
  }, []);

  useEffect(() => {
    if (!el) return undefined;
    const onWheel = (e) => wheelToHorizontal(e, el);
    const onScroll = () => update(el);
    const resize = new ResizeObserver(() => update(el));
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("scroll", onScroll, { passive: true });
    resize.observe(el);
    if (el.firstElementChild) resize.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("scroll", onScroll);
      resize.disconnect();
    };
  }, [el, update]);

  return { attach: setEl, ...edges };
}
