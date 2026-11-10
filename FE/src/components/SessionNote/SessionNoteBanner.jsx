import { useTranslation } from "react-i18next";
import { ChevronDown, Quote } from "lucide-react";
import { cn } from "~/lib/utils";
import { NOTE_PANEL_CLASS, useNotePanel } from "./useNotePanel";

/**
 * Ghi chú của trưởng nhóm, đặt giữa header trang ma trận (member + lead).
 * Hiện một dòng nội dung, bấm để xem đầy đủ. Không có ghi chú thì không hiện gì.
 */
function SessionNoteBanner({ note }) {
  const { t } = useTranslation();
  const { ref, open, toggle, panelStyle } = useNotePanel();
  if (!note) return null;

  return (
    <div ref={ref} className="relative min-w-0 max-w-full md:max-w-[34rem]">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex h-10 w-full max-w-full cursor-pointer items-center gap-2 rounded-2xl border border-sky-200 bg-linear-to-r from-sky-50 to-white py-1 pr-3 pl-1.5 text-left shadow-2xs transition-colors hover:border-sky-300"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white shadow-sm shadow-sky-500/30">
          <Quote size={14} />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-sky-900">{note}</span>
        <ChevronDown size={15} className={cn("shrink-0 text-sky-500 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div style={panelStyle} className={cn(NOTE_PANEL_CLASS, "left-1/2 -translate-x-1/2 max-sm:translate-x-0")}>
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-sky-700 uppercase">
            <Quote size={12} /> {t("sessionNote.title")}
          </p>
          <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm whitespace-pre-wrap text-slate-800">{note}</p>
        </div>
      )}
    </div>
  );
}

export default SessionNoteBanner;
