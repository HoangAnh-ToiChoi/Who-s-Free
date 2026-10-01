import { useState, useEffect, useRef, useCallback } from "react";

/**
 * useCellDetailPopover - Hook quản lý toạ độ xuất hiện thông minh của popover chi tiết ô
 *
 * Tính toán vị trí kề bên ô được chọn:
 * - Tự động phát hiện khoảng trống cạnh trái/phải để flip hướng (tránh che khuất ô chọn và tràn màn hình).
 * - Căn chỉnh toạ độ Y và clamp giới hạn biên trên (header) và biên dưới (legend).
 * - Tự động cuộn ô vào tầm nhìn (scrollIntoView) nếu ô nằm ngoài viewport cuộn khi chọn từ sidebar.
 * - Lắng nghe sự kiện scroll/resize với requestAnimationFrame để di chuyển mượt mà.
 */
export function useCellDetailPopover({
  selectedCell,
  containerRef,
  scrollRef,
  onClose,
}) {
  const [position, setPosition] = useState(null);
  const popoverRef = useRef(null);

  const calculatePosition = useCallback(() => {
    if (!selectedCell || !containerRef?.current) {
      setPosition(null);
      return;
    }

    const cellId = `heatmap-cell-${selectedCell.dayIndex}-${selectedCell.blockStart}`;
    const cellEl = document.getElementById(cellId);
    if (!cellEl) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const cellRect = cellEl.getBoundingClientRect();

    // Kích thước của popover (đo từ DOM hoặc fallback mặc định)
    const popoverWidth = popoverRef.current?.offsetWidth || 300;
    const popoverHeight = popoverRef.current?.offsetHeight || 260;

    // Khoảng trống khả dụng 2 bên của ô so với container
    const spaceRight = containerRect.right - cellRect.right;
    const spaceLeft = cellRect.left - containerRect.left;

    let left = 0;
    let placement = "right";

    // Quy tắc Auto-Flip: ưu tiên bên phải nếu còn ít nhất (width + 16px)
    if (spaceRight >= popoverWidth + 16) {
      left = cellRect.right - containerRect.left + 8;
      placement = "right";
    } else if (spaceLeft >= popoverWidth + 16) {
      left = cellRect.left - containerRect.left - popoverWidth - 8;
      placement = "left";
    } else {
      // Trường hợp container hẹp: clamp vào giữa container
      left = Math.max(
        12,
        Math.min(
          cellRect.left - containerRect.left,
          containerRect.width - popoverWidth - 12
        )
      );
      placement = "center";
    }

    // Căn giữa theo trục Y của ô và clamp chống tràn biên trên (header) và biên dưới (legend)
    const cellCenterY = cellRect.top - containerRect.top + cellRect.height / 2;
    let top = cellCenterY - popoverHeight / 2;

    const minTop = 48; // Chiều cao Header bảng
    const maxTop = Math.max(minTop, containerRect.height - popoverHeight - 48);
    top = Math.max(minTop, Math.min(top, maxTop));

    setPosition({
      top: Math.round(top),
      left: Math.round(left),
      placement,
    });
  }, [selectedCell, containerRef]);

  // Tự động cuộn ô vào tầm nhìn khi click từ danh sách bên phải
  useEffect(() => {
    if (!selectedCell || !scrollRef?.current) return;

    const cellId = `heatmap-cell-${selectedCell.dayIndex}-${selectedCell.blockStart}`;
    const cellEl = document.getElementById(cellId);
    if (!cellEl) return;

    const scrollRect = scrollRef.current.getBoundingClientRect();
    const cellRect = cellEl.getBoundingClientRect();

    // Nếu ô bị che khuất ở trên hoặc dưới viewport của vùng cuộn
    if (cellRect.top < scrollRect.top + 40 || cellRect.bottom > scrollRect.bottom - 40) {
      cellEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [selectedCell, scrollRef]);

  // Cập nhật vị trí khi selectedCell thay đổi hoặc khi resize / scroll
  useEffect(() => {
    if (!selectedCell) {
      setPosition(null);
      return;
    }

    // Tính toán vị trí ban đầu
    const rafId = requestAnimationFrame(calculatePosition);

    const scrollEl = scrollRef?.current;
    let tick = false;

    const handleScrollOrResize = () => {
      if (!tick) {
        requestAnimationFrame(() => {
          calculatePosition();
          tick = false;
        });
        tick = true;
      }
    };

    if (scrollEl) {
      scrollEl.addEventListener("scroll", handleScrollOrResize, { passive: true });
    }
    window.addEventListener("resize", handleScrollOrResize, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      if (scrollEl) {
        scrollEl.removeEventListener("scroll", handleScrollOrResize);
      }
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [selectedCell, scrollRef, calculatePosition]);

  // Đóng popover khi nhấn ESC
  useEffect(() => {
    if (!selectedCell || !onClose) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCell, onClose]);

  return {
    popoverRef,
    position,
    calculatePosition,
  };
}
