import { useRef, useState } from "react";
import { useClickOutside } from "~/hooks";

/** Khung popover ghi chú: desktop neo dưới nút (absolute), mobile cố định theo màn hình ngay dưới nút. */
export const NOTE_PANEL_CLASS =
  "absolute top-full z-50 mt-2 w-[360px] rounded-2xl border border-sky-200 bg-white p-3 shadow-xl shadow-sky-900/10 animate-in fade-in slide-in-from-top-1 duration-150 max-sm:fixed max-sm:inset-x-4 max-sm:mt-0 max-sm:w-auto";

/** Mở/đóng popover, tự đóng khi bấm ra ngoài (trừ lúc `busy`, vd đang lưu). */
export function useNotePanel({ busy = false, onClose } = {}) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [mobileTop, setMobileTop] = useState(null);

  const close = () => {
    setOpen(false);
    onClose?.();
  };
  useClickOutside(ref, () => {
    if (open && !busy) close();
  });

  const toggle = () => {
    if (open) return close();
    setMobileTop(window.innerWidth < 640 ? ref.current.getBoundingClientRect().bottom + 8 : null);
    setOpen(true);
  };

  return { ref, open, toggle, close, panelStyle: mobileTop === null ? undefined : { top: mobileTop } };
}
