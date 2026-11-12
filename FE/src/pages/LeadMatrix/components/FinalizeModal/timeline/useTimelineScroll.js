import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { wheelToHorizontal } from "~/hooks/useHorizontalScroll";

const EDGE_PX = 2;
const PAN_SLOP_PX = 4;
const STEP_HOURS = 3;
// Trạng thái nắm kéo theo khối cuộn (handler gắn trên chính khối đó → e.currentTarget), không cần ref
const panState = new WeakMap();

/**
 * Cuộn ngang bảng giờ của timeline cho dễ dùng trên laptop (điện thoại vuốt sẵn):
 * - Co giãn: mỗi giờ rộng vừa để cả khoảng giờ nằm gọn trong khung; chỉ khi hẹp hơn minPx mới phải cuộn.
 * - scrollByStep(±1): nút ‹ › trượt êm 3 giờ; atStart/atEnd để làm mờ nút ở mép.
 * - pan: nhấn giữ chuột ở bất kỳ chỗ nào trong bảng rồi kéo để trượt — trừ đoạn giờ / tay nắm ([data-select]) và nút.
 * - headerRef: lăn chuột trên hàng giờ trên cùng → cuộn ngang (chỗ khác vẫn cuộn dọc như thường).
 */
export function useTimelineScroll({ hours, labelWidth, minPx }) {
  const [el, setEl] = useState(null);
  const [header, setHeader] = useState(null);
  const [view, setView] = useState({ available: 0, atStart: true, atEnd: true });
  const [isPanning, setIsPanning] = useState(false);

  // Một lần đo cho cả bề rộng khả dụng (co giãn) lẫn vị trí mép (nút ‹ ›): khi cuộn và khi đổi kích thước.
  // Đo ngay trước lần vẽ đầu (layout effect) để bảng hiện đúng bề rộng luôn, không co giãn lại sau khi đã hiện (giật).
  useLayoutEffect(() => {
    if (!el) return undefined;
    const update = () => {
      const next = {
        // Làm tròn xuống để tổng bề rộng không vượt khung (thừa 1px là hiện thanh cuộn)
        available: Math.floor(el.clientWidth - labelWidth),
        atStart: el.scrollLeft <= EDGE_PX,
        atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - EDGE_PX,
      };
      setView((prev) =>
        prev.available === next.available && prev.atStart === next.atStart && prev.atEnd === next.atEnd ? prev : next
      );
    };
    update();
    const resize = new ResizeObserver(update);
    resize.observe(el);
    if (el.firstElementChild) resize.observe(el.firstElementChild);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      resize.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [el, labelWidth]);

  useEffect(() => {
    if (!header || !el) return undefined;
    const onWheel = (e) => wheelToHorizontal(e, el);
    header.addEventListener("wheel", onWheel, { passive: false });
    return () => header.removeEventListener("wheel", onWheel);
  }, [header, el]);

  const fit = hours > 0 && view.available > 0 ? Math.floor((view.available / hours) * 10) / 10 : 0;
  const pxPerHour = Math.max(minPx, fit);

  const scrollByStep = useCallback(
    (dir) => el?.scrollBy({ left: dir * STEP_HOURS * pxPerHour, behavior: "smooth" }),
    [el, pxPerHour]
  );

  const onPointerDown = useCallback((e) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || e.target.closest("button, [data-select]")) return;
    panState.set(e.currentTarget, { x: e.clientX, left: e.currentTarget.scrollLeft, moved: false });
  }, []);
  const onPointerMove = useCallback((e) => {
    const node = e.currentTarget;
    const pan = panState.get(node);
    if (!pan) return;
    const dx = e.clientX - pan.x;
    if (!pan.moved) {
      if (Math.abs(dx) < PAN_SLOP_PX) return;
      pan.moved = true;
      node.setPointerCapture?.(e.pointerId);
      setIsPanning(true);
    }
    node.scrollLeft = pan.left - dx;
  }, []);
  const endPan = useCallback((e) => {
    panState.delete(e.currentTarget);
    setIsPanning(false);
  }, []);

  return {
    setScrollEl: setEl,
    scrollEl: el,
    headerRef: setHeader,
    pxPerHour,
    canScroll: !(view.atStart && view.atEnd),
    atStart: view.atStart,
    atEnd: view.atEnd,
    scrollByStep,
    isPanning,
    pan: { onPointerDown, onPointerMove, onPointerUp: endPan, onPointerCancel: endPan },
  };
}

export default useTimelineScroll;
