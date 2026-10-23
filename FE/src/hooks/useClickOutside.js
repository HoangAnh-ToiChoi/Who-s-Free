import { useEffect } from "react";

/**
 * Custom hook xử lý sự kiện click ra ngoài một element
 * @param {React.RefObject} ref - Ref của element cần lắng nghe
 * @param {Function} handler - Hàm callback khi click ra ngoài
 */
export function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      // Nếu không có ref hoặc click vào bên trong ref thì bỏ qua
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

export default useClickOutside;
