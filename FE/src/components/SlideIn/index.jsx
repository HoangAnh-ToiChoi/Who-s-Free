const STAGGER_MS = 70;
const MAX_STAGGER_STEPS = 8;

// Class viết đầy đủ để Tailwind nhận diện được
const DIRECTION_CLASS = {
  left: "slide-in-from-left-8",
  up: "slide-in-from-bottom-6",
};

/**
 * SlideIn - Hiệu ứng xuất hiện (dùng chung): trượt từ trái sang phải (`left`) hoặc từ dưới lên (`up`).
 * `index` là thứ tự phần tử trong danh sách / trang để các phần tử hiện lần lượt.
 * Tôn trọng chế độ giảm chuyển động của hệ thống.
 */
function SlideIn({ index = 0, direction = "left", className = "", style, children, ...props }) {
  const delay = Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS;
  return (
    <div
      className={`animate-in fade-in-0 ${DIRECTION_CLASS[direction]} fill-mode-backwards duration-500 ease-out motion-reduce:animate-none ${className}`}
      style={{ animationDelay: `${delay}ms`, ...style }}
      {...props}
    >
      {children}
    </div>
  );
}

export default SlideIn;
