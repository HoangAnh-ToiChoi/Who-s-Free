import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, Check } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ConfirmModal } from "~/components/Modals";

/** Chân popover: Xoá (có hộp xác nhận) hoặc Huỷ, và nút Áp dụng. */
function SlotPopoverFooter({ isEditMode, isInvalidTime, onDelete, onClose }) {
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="pt-2 flex items-center justify-between border-t border-slate-100">
      {isEditMode ? (
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="flex h-11 sm:h-8 items-center gap-1.5 px-3 sm:px-2.5 rounded-lg text-sm sm:text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 cursor-pointer transition-colors active:scale-[0.98]"
        >
          <Trash2 size={14} />
          <span>{t("slotPopover.delete")}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onClose}
          className="h-11 sm:h-8 px-4 sm:px-3 rounded-lg text-sm sm:text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors"
        >
          {t("slotPopover.cancel")}
        </button>
      )}

      <Button
        type="submit"
        disabled={isInvalidTime}
        className="h-11 sm:h-9 px-5 sm:px-4 rounded-xl text-sm sm:text-xs font-semibold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
      >
        <Check size={14} strokeWidth={2.5} />
        <span>{t("slotPopover.apply")}</span>
      </Button>

      <ConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("slotPopover.deleteConfirmTitle")}
        description={t("slotPopover.deleteConfirmDesc")}
        confirmText={t("slotPopover.deleteConfirm")}
        cancelText={t("slotPopover.deleteKeep")}
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete();
        }}
      />
    </div>
  );
}

export default SlotPopoverFooter;
