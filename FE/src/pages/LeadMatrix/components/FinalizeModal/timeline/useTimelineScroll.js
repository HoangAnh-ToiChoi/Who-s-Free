import { useCallback, useEffect, useState } from "react";
import useHorizontalScroll, { wheelToHorizontal } from "~/hooks/useHorizontalScroll";

const PAN_SLOP_PX = 4;
const STEP_HOURS = 3;
const panState = new WeakMap();

/**
 * Cuộn ngang bảng giờ của timeline cho dễ dùng trên laptop (điện thoại vuốt sẵn):
 * 1. Co giãn: mỗi giờ rộng vừa đủ để cả khoảng giờ nằm gọn trong khung; chỉ khi quá hẹp (< minPx) mới cho cuộn.
 * 2. scrollByStep(±1): nút ◀ ▶ trượt êm STEP_HOURS giờ; atStart/atEnd để làm mờ nút ở mép.
 * 3. pan: nhấn giữ chuột ở chỗ trống / hàng giờ rồi kéo để trượt bảng (không áp dụng trên thanh chọn giờ và nút bấm).
 * 4. headerRef: lăn chuột khi con trỏ ở hàng giờ trên cùng → cuộn ngang (chỗ khác vẫn cuộn dọc như thường).
 */
export function useTimelineScroll({ hours, labelWidth, minPx }) {
  const { attach, atStart, atEnd } = useHorizontalScroll({ wheel: false });
  const [el, setEl] = useState(null);
  const [available, setAvailable] = useState(0);

  const setScrollEl = useCallback(
    (node) => {
      setEl(node);
      attach(node);
    },
    [attach]
  );

  useEffect(() => {
    if (!el) return undefined;
    // Làm tròn xuống để tổng bề rộng không vượt khung (tránh thừa 1px gây thanh cuộn)
    const measure = () => setAvailable(Math.floor(el.clientWidth - labelWidth));
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    return () => resize.disconnect();
  }, [el, labelWidth]);

  const pxPerHour = Math.max(minPx, hours > 0 && available > 0 ? Math.floor((available / hours) * 10) / 10 : minPx);
  const canScroll = !(atStart && atEnd);

  const scrollByStep = useCallback(
    (dir) => el?.scrollBy({ left: dir * STEP_HOURS * pxPerHour, behavior: "smooth" }),
    [el, pxPerHour]
  );

  // 4. Lăn chuột trên hàng giờ = cuộn ngang
  const [header, setHeader] = useState(null);
  useEffect(() => {
    if (!header || !el) return undefined;
    const onWheel = (e) => wheelToHorizontal(e, el);
    header.addEventListener("wheel", onWheel, { passive: false });
    return () => header.removeEventListener("wheel", onWheel);
  }, [header, el]);

  // 3. Nhấn giữ rồi kéo để trượt bảng (chuột); cảm ứng đã có vuốt sẵn của trình duyệt.
  // Trạng thái kéo lưu theo phần tử (panState), handler gắn trên chính khối cuộn nên dùng e.currentTarget.
  const [isPanning, setIsPanning] = useState(false);
  const onPointerDown = useCallback((e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    if (e.target.closest("button, [data-select-bar]")) return;
    panState.set(e.currentTarget, { x: e.clientX, left: e.currentTarget.scrollLeft, moved: false });
  }, []);
  const onPointerMove = useCallback((e) => {
    const node = e.currentTarget;
    const pan = panState.get(node);
    if (!pan) return;
    const dx = e.clientX - pan.x;
    if (!pan.moved && Math.abs(dx) < PAN_SLOP_PX) return;
    if (!pan.moved) {
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
    setScrollEl,
    scrollEl: el,
    headerRef: setHeader,
    pxPerHour,
    canScroll,
    atStart,
    atEnd,
    scrollByStep,
    isPanning,
    pan: { onPointerDown, onPointerMove, onPointerUp: endPan, onPointerCancel: endPan },
  };
}

export default useTimelineScroll;
