const STAGGER_MS = 70;
const MAX_STAGGER_STEPS = 8;

/**
 * SlideIn - Hiệu ứng xuất hiện dùng chung cho mọi trang: mờ dần + trượt từ dưới lên.
 * `index` là thứ tự phần tử trong danh sách / trang để các phần tử hiện lần lượt.
 * Tôn trọng chế độ giảm chuyển động của hệ thống.
 */
function SlideIn({ index = 0, className = "", style, children, ...props }) {
  const delay = Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS;
  return (
    <div
      className={`animate-in fade-in-0 slide-in-from-bottom-6 fill-mode-backwards duration-500 ease-out motion-reduce:animate-none ${className}`}
      style={{ animationDelay: `${delay}ms`, ...style }}
      {...props}
    >
      {children}
    </div>
  );
}

export default SlideIn;
