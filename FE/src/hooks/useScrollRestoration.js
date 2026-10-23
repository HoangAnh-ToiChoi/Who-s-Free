import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * useScrollRestoration - Custom hook tối ưu lưu và phục hồi vị trí cuộn khi F5 (Reload trang)
 * Tái sử dụng linh hoạt cho bất kỳ khung cuộn nào trong toàn bộ ứng dụng.
 * 
 * @param {string} storageKey - Khóa duy nhất lưu trong sessionStorage
 * @param {Object} [options={}] - Cấu hình tùy chọn
 * @param {number} [options.defaultScrollTop=0] - Vị trí cuộn mặc định ban đầu nếu chưa có dữ liệu lưu
 * @param {boolean} [options.enabled=true] - Bật/tắt tính năng lưu cuộn
 * @param {React.MutableRefObject} [options.ref] - Ref truyền từ ngoài vào nếu component đã có sẵn ref
 * @returns {React.MutableRefObject} Ref gắn vào phần tử cuộn
 */
export function useScrollRestoration(storageKey, options = {}) {
  const { defaultScrollTop = 0, enabled = true, ref: externalRef } = options;
  const internalRef = useRef(null);
  const elementRef = externalRef || internalRef;

  // 1. Phục hồi vị trí cuộn ngay trước khi trình duyệt vẽ màn hình (Pre-paint) bằng useLayoutEffect
  // Giúp triệt tiêu hoàn toàn cú giật màn hình từ 00:00 xuống 08:00
  useLayoutEffect(() => {
    if (!enabled || !storageKey) return;
    const el = elementRef.current;
    if (!el) return;

    const applyScroll = (targetTop) => {
      const prevBehavior = el.style.scrollBehavior;
      el.style.scrollBehavior = "auto";
      el.scrollTop = targetTop;
      el.style.scrollBehavior = prevBehavior;
    };

    try {
      const saved = sessionStorage.getItem(`scroll_pos_${storageKey}`);
      if (saved !== null && !isNaN(Number(saved))) {
        applyScroll(Number(saved));
      } else if (defaultScrollTop > 0) {
        applyScroll(defaultScrollTop);
      }
    } catch {
      if (defaultScrollTop > 0) {
        applyScroll(defaultScrollTop);
      }
    }
  }, [storageKey, defaultScrollTop, enabled, elementRef]);

  // 2. Lắng nghe và lưu vị trí cuộn mượt mà với requestAnimationFrame (chuẩn 60fps)
  useEffect(() => {
    if (!enabled || !storageKey) return;
    const el = elementRef.current;
    if (!el) return;

    let rafId = null;

    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        try {
          sessionStorage.setItem(`scroll_pos_${storageKey}`, String(el.scrollTop));
        } catch {
          // Bỏ qua nếu storage đầy hoặc ở môi trường đặc biệt
        }
      });
    };

    el.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      el.removeEventListener("scroll", handleScroll);
    };
  }, [storageKey, enabled, elementRef]);

  return elementRef;
}

export default useScrollRestoration;
