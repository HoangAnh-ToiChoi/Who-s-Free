import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Quote } from "lucide-react";
import { cn } from "~/lib/utils";
import { sessionService } from "~/service/sessionService/sessionService";
import { NOTE_PANEL_CLASS, useNotePanel } from "./useNotePanel";

const MAX_NOTE_LENGTH = 500;

/**
 * Nút "Thêm/Sửa ghi chú" của trưởng nhóm (màn Lead), luôn hiện: desktop ngay trên Xuất file/Chốt lịch, mobile trên header.
 * Bấm mở khung soạn sẵn nội dung hiện tại; Lưu thì ghi chú mới thay ghi chú cũ, để trống = xoá.
 */
function SessionNoteEditButton({ sessionId, note = "", onSaved, className }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(note);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { ref, open, toggle, close, panelStyle } = useNotePanel({ busy: saving, onClose: () => setError("") });

  const openEditor = () => {
    if (!open) setDraft(note);
    toggle();
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const updated = await sessionService.updateSessionNote(sessionId, draft.trim());
      onSaved?.({ description: updated?.description ?? draft.trim() });
      close();
    } catch (err) {
      setError(err?.message || t("sessionNote.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={ref} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        onClick={openEditor}
        aria-expanded={open}
        aria-label={t(note ? "sessionNote.edit" : "sessionNote.add")}
        className="inline-flex h-10 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] sm:h-8"
      >
        <Quote size={14} className="text-slate-500 max-sm:size-5" />
        <span className="max-sm:hidden">{t(note ? "sessionNote.edit" : "sessionNote.add")}</span>
      </button>

      {open && (
        <div style={panelStyle} className={cn(NOTE_PANEL_CLASS, "right-0")}>
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-sky-700 uppercase">
            <Quote size={12} /> {t("sessionNote.title")}
          </p>
          <textarea
            autoFocus
            value={draft}
            maxLength={MAX_NOTE_LENGTH}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("sessionNote.placeholder")}
            rows={4}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-500 focus:bg-white"
          />
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">{draft.length}/{MAX_NOTE_LENGTH}</span>
            <div className="flex gap-1.5">
              <button type="button" onClick={close} disabled={saving} className="h-8 cursor-pointer rounded-lg px-3 text-xs font-medium text-slate-600 hover:bg-slate-100">
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving || draft.trim() === note}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-sky-600 px-3 text-xs font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving && <Loader2 size={12} className="animate-spin" />}
                {t("sessionNote.save")}
              </button>
            </div>
          </div>
          {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
        </div>
      )}
    </div>
  );
}

export default SessionNoteEditButton;
