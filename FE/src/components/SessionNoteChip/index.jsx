import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Pencil, Plus, Quote } from "lucide-react";
import { cn } from "~/lib/utils";
import { useClickOutside } from "~/hooks";
import { sessionService } from "~/service/sessionService/sessionService";

const MAX_NOTE_LENGTH = 500;

/**
 * Ghi chú của trưởng nhóm cho phiên, đặt cạnh tên phiên ở trang ma trận (member + lead).
 * Chip xanh dương hiện đoạn đầu ghi chú, bấm để xem đầy đủ; lead (canEdit) sửa/xoá ngay trong khung đó.
 * Không có ghi chú: thành viên không thấy gì, lead thấy nút "Thêm ghi chú".
 */
function SessionNoteChip({ session, canEdit = false, onSaved }) {
  const { t } = useTranslation();
  const note = session?.description || "";
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(null); // null = đang xem, chuỗi = đang sửa
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [mobileTop, setMobileTop] = useState(null); // mobile: khung ghi chú cố định theo màn hình, ngay dưới chip
  const ref = useRef(null);
  useClickOutside(ref, () => {
    if (!saving) close();
  });

  if (!note && !canEdit) return null;

  function close() {
    setOpen(false);
    setDraft(null);
    setError("");
  }

  const openPanel = () => {
    if (open) return close();
    setMobileTop(window.innerWidth < 640 ? ref.current.getBoundingClientRect().bottom + 8 : null);
    setOpen(true);
    if (!note) setDraft("");
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const updated = await sessionService.updateSessionNote(session.id, draft.trim());
      onSaved?.({ description: updated?.description ?? draft.trim() });
      close();
    } catch (err) {
      setError(err?.message || t("sessionNote.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={ref} className="relative min-w-0 max-w-40">
      <button
        type="button"
        onClick={openPanel}
        aria-expanded={open}
        aria-label={note || t("sessionNote.add")}
        className={cn(
          // Mobile chỉ hiện icon để nhường chỗ cho tên phiên
          "inline-flex h-7 max-w-full cursor-pointer items-center gap-1.5 rounded-full border py-0.5 pr-1 pl-1 text-xs font-semibold transition-colors sm:pr-3",
          note
            ? "border-sky-200 bg-linear-to-r from-sky-50 to-white text-sky-800 shadow-2xs hover:border-sky-300"
            : "border-dashed border-slate-300 bg-white text-slate-500 hover:border-sky-300 hover:text-sky-700"
        )}
      >
        <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full", note ? "bg-sky-500 text-white" : "text-slate-400")}>
          {note ? <Quote size={11} /> : <Plus size={13} />}
        </span>
        <span className="truncate max-sm:hidden">{note || t("sessionNote.add")}</span>
      </button>

      {open && (
        <div
          style={mobileTop === null ? undefined : { top: mobileTop }}
          className="absolute top-full left-0 z-50 mt-2 w-[340px] rounded-2xl max-sm:fixed max-sm:inset-x-4 max-sm:mt-0 max-sm:w-auto border border-sky-200 bg-white p-3 shadow-xl shadow-sky-900/10 animate-in fade-in slide-in-from-top-1 duration-150">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-sky-700 uppercase">
            <Quote size={12} /> {t("sessionNote.title")}
          </p>

          {draft === null ? (
            <>
              <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm whitespace-pre-wrap text-slate-800">{note}</p>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setDraft(note)}
                  className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900"
                >
                  <Pencil size={12} /> {t("sessionNote.edit")}
                </button>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default SessionNoteChip;
