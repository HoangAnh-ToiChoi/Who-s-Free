import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "~/lib/utils";
import BodyPortal from "~/components/BodyPortal";

/**
 * Nút 3 chấm mở menu nhỏ các hành động (Sửa / Xoá / ...). Dùng chung cho thẻ phiên, thẻ nhóm, header nhóm, thẻ thành viên.
 * items: [{ key, label, icon: LucideIcon, onSelect, danger?, hidden? }] — mục hidden bị bỏ; không còn mục nào thì không hiện nút.
 * Menu render vào <body> (fixed, canh theo nút) để không bị thẻ cha có overflow-hidden cắt mất.
 * Mọi click đều dừng lan ra ngoài và chặn điều hướng mặc định, để không kích hoạt thẻ cha
 * (thẻ phiên mở ma trận, thẻ nhóm là <Link>) — kể cả click trong menu vì sự kiện portal vẫn nổi lên cây React.
 */
function ActionMenu({ items = [], label = "Tùy chọn", className, buttonClassName }) {
  const [position, setPosition] = useState(null); // null = đóng
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const open = position !== null;

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setPosition(null);
    const onPointerDown = (e) => {
      if (buttonRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      close();
    };
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const visible = items.filter((item) => item && !item.hidden);
  if (visible.length === 0) return null;

  const stop = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const toggle = () => {
    if (open) return setPosition(null);
    const rect = buttonRef.current.getBoundingClientRect();
    setPosition({ top: rect.bottom + 4, right: Math.max(8, window.innerWidth - rect.right) });
  };

  return (
    <div className={cn("relative shrink-0", className)} onClick={stop}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        className={cn(
          "flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600",
          open && "bg-slate-100 text-slate-700",
          buttonClassName
        )}
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <BodyPortal>
          <div
            ref={menuRef}
            role="menu"
            onClick={stop}
            style={{ top: position.top, right: position.right }}
            className="fixed z-[60] min-w-[170px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg animate-in fade-in slide-in-from-top-1 duration-100"
          >
            {visible.map(({ key, label: itemLabel, icon: Icon, onSelect, danger }) => (
              <button
                key={key}
                type="button"
                role="menuitem"
                onClick={() => {
                  setPosition(null);
                  onSelect?.();
                }}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium whitespace-nowrap transition-colors",
                  danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-700 hover:bg-slate-50"
                )}
              >
                {Icon && <Icon size={14} className="shrink-0" />}
                <span>{itemLabel}</span>
              </button>
            ))}
          </div>
        </BodyPortal>
      )}
    </div>
  );
}

export default ActionMenu;
