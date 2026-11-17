import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ClipboardCopy, TriangleAlert } from "lucide-react";
import { Button } from "~/components/ui/button";
import { COPY_STYLES } from "~/utils/finalizeMessage";
import { useCopyFinalizeMessage } from "../../hooks/useCopyFinalizeMessage";

/** Nút "Copy tin nhắn chốt lịch": chọn giọng văn rồi dán thẳng vào Zalo/Messenger. */
function CopyMessageButton({ title, members, link }) {
  const { t } = useTranslation();
  const { status, copy } = useCopyFinalizeMessage({ title, members, link });
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const menuRef = useRef(null);
  const Icon = status === "copied" ? Check : status === "failed" ? TriangleAlert : ClipboardCopy;
  const label = t(status === "copied" ? "finalize.copied" : status === "failed" ? "finalize.copyFailed" : "finalize.copyMessageButton");

  // Nút có thể nằm sát mép màn hình nhỏ: dịch menu vào trong khung nhìn để không bị cắt.
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!open || !menu) return;
    const margin = 8;
    const { left, right } = menu.getBoundingClientRect();
    const shift = left < margin ? margin - left : right > window.innerWidth - margin ? window.innerWidth - margin - right : 0;
    menu.style.transform = shift ? `translateX(${shift}px)` : "";
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const pick = (style) => {
    setOpen(false);
    copy(style);
  };

  return (
    <div ref={wrapRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((value) => !value)}
        aria-live="polite"
        aria-haspopup="menu"
        aria-expanded={open}
        title={t("finalize.copyMessageButton")}
        className={`h-7 px-2.5 rounded-lg text-xs font-semibold gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98] ${
          status === "copied"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : status === "failed"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-indigo-200/90 bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800"
        }`}
      >
        <Icon size={13} className="shrink-0" />
        <span className={status === "idle" ? "hidden sm:inline" : undefined}>{label}</span>
      </Button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute right-0 top-full z-30 mt-1.5 w-60 max-w-[calc(100vw-1rem)] rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
        >
          {COPY_STYLES.map((style) => (
            <button
              key={style}
              type="button"
              role="menuitem"
              onClick={() => pick(style)}
              className="w-full cursor-pointer rounded-lg px-3 py-2 text-left hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
            >
              <span className="block text-sm font-semibold text-slate-800">{t(`finalize.copyStyle.${style}.label`)}</span>
              <span className="block text-xs text-slate-500">{t(`finalize.copyStyle.${style}.hint`)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default CopyMessageButton;
