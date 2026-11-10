import { useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "~/lib/utils";
import { useClickOutside } from "~/hooks";

/**
 * Nút 3 chấm mở menu nhỏ các hành động (Sửa / Xoá / ...). Dùng chung cho thẻ phiên, header nhóm, thẻ thành viên.
 * items: [{ key, label, icon: LucideIcon, onSelect, danger?, hidden? }] — mục hidden bị bỏ; không còn mục nào thì không hiện nút.
 * Mọi click đều dừng lan ra ngoài để không kích hoạt onClick của thẻ cha (vd thẻ phiên mở ma trận).
 */
function ActionMenu({ items = [], label = "Tùy chọn", className, buttonClassName }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));

  const visible = items.filter((item) => item && !item.hidden);
  if (visible.length === 0) return null;

  const stop = (e) => e.stopPropagation();

  return (
    <div ref={ref} className={cn("relative shrink-0", className)} onClick={stop}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
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
        <div
          role="menu"
          className="absolute top-full right-0 z-50 mt-1 min-w-[170px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg animate-in fade-in slide-in-from-top-1 duration-100"
        >
          {visible.map(({ key, label: itemLabel, icon: Icon, onSelect, danger }) => (
            <button
              key={key}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
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
      )}
    </div>
  );
}

export default ActionMenu;
