import { useState, useCallback } from "react";

/**
 * Hook quản lý riêng biệt trạng thái và thuật toán tính tọa độ neo Popover có mũi tên
 * Đảm bảo Popover không bao giờ bị tràn khỏi màn hình (Smart edge detection).
 */
export function useSlotPopover() {
  const [popover, setPopover] = useState({
    isOpen: false,
    mode: "new", // "new" | "edit"
    slotData: null,
    anchorPos: { top: 0, left: 0, placement: "right" },
  });

  const openPopover = useCallback(({ mode, slotData, anchorRect, containerRect, clickY }) => {
    if (!anchorRect) return;

    const popoverWidth = 330;
    const popoverHeight = 310;

    const relTop = anchorRect.top - (containerRect ? containerRect.top : 0);
    const relLeft = anchorRect.left - (containerRect ? containerRect.left : 0);
    const relRight = (containerRect ? containerRect.right : window.innerWidth) - anchorRect.right;
    const containerHeight = containerRect ? containerRect.height : window.innerHeight;

    // 1. Phân chia khung slot làm 2 nửa theo vị trí bấm (hoặc giữa slot nếu tạo từ kéo chuột)
    const slotClickOffsetY = clickY != null ? clickY - anchorRect.top : anchorRect.height / 2;
    const isTopHalf = slotClickOffsetY < anchorRect.height / 2;

    // 2. Điểm neo mục tiêu trên slot (Target Y) mà mũi tên sẽ chỉa vào
    // Nếu bấm nửa trên: chỉa vào điểm 28px từ đỉnh slot (hoặc 35% chiều cao)
    // Nếu bấm nửa dưới: chỉa vào điểm 28px từ đáy slot (hoặc 65% chiều cao)
    const arrowAnchorRelY = isTopHalf
      ? relTop + Math.min(28, anchorRect.height * 0.35)
      : relTop + Math.max(anchorRect.height - 28, anchorRect.height * 0.65);

    // 3. Tính toạ độ Popover theo nửa được bấm
    // Nếu bấm nửa trên -> đặt Popover sao cho mũi tên nằm ở phần trên của Popover (~36px)
    // Nếu bấm nửa dưới -> lật Popover lên trên sao cho mũi tên nằm ở phần dưới của Popover
    let popoverTop = isTopHalf
      ? arrowAnchorRelY - 36
      : arrowAnchorRelY - (popoverHeight - 48);

    // 4. Chống tràn mép trên & mép dưới khung lưới (Edge Clamping)
    const minTop = 10;
    const maxTop = Math.max(minTop, containerHeight - popoverHeight - 12);
    const clampedPopoverTop = Math.max(minTop, Math.min(popoverTop, maxTop));

    // 5. Toạ độ động của mũi tên trên Popover (bám tuyệt đối vào điểm neo trên slot)
    let arrowTop = arrowAnchorRelY - clampedPopoverTop;
    // Giới hạn mũi tên không bị lọt ra khỏi góc bo viền của Popover
    arrowTop = Math.max(22, Math.min(arrowTop, popoverHeight - 22));

    // 6. Tự động lật sang trái / phải
    const placeRight = relRight >= popoverWidth + 15;
    const left = placeRight
      ? relLeft + anchorRect.width + 12
      : Math.max(10, relLeft - popoverWidth - 12);

    setPopover({
      isOpen: true,
      mode,
      slotData,
      anchorPos: {
        top: clampedPopoverTop,
        left,
        arrowTop,
        placement: placeRight ? "right" : "left",
      },
    });
  }, []);

  const closePopover = useCallback(() => {
    setPopover((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return {
    popover,
    openPopover,
    closePopover,
  };
}

export default useSlotPopover;
