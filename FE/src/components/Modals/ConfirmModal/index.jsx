import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import BaseModal from "~/components/Modals/BaseModal";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

// Nút xác nhận và biểu tượng tô đặc để người dùng thấy ngay đâu là hành động nguy hiểm
const TONES = {
  danger: {
    icon: "text-white",
    iconWrapper: "bg-rose-600 border-rose-600",
    confirm: "text-white border-rose-600 bg-rose-600 hover:bg-rose-700 hover:border-rose-700",
    hint: "text-rose-700",
    focus: "focus-visible:border-rose-500 focus-visible:ring-rose-500/20",
  },
  warning: {
    icon: "text-white",
    iconWrapper: "bg-amber-500 border-amber-500",
    confirm: "text-white border-amber-600 bg-amber-600 hover:bg-amber-700 hover:border-amber-700",
    hint: "text-amber-800",
    focus: "focus-visible:border-amber-500 focus-visible:ring-amber-500/20",
  },
};

/**
 * ConfirmModal - Modal xác nhận hành động nguy hiểm / không hoàn tác được
 * Thiết kế theo chuẩn UX Facebook (chống "tay nhanh hơn não"):
 * - Nút hành động (Xóa / Nâng quyền...) nằm bên TRÁI.
 * - Nút Giữ lại / Hủy (an toàn, mặc định quán tính) nằm bên PHẢI.
 * tone: "danger" (đỏ, mặc định) | "warning" (vàng — hành động không hoàn tác nhưng không phải xoá).
 * requireText: bắt gõ đúng chuỗi này (vd tên nhóm) mới bật nút xác nhận. children: nội dung thêm trong thân modal.
 */
function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Xác nhận xóa",
  cancelText = "Giữ lại",
  confirmIcon: ConfirmIcon = Trash2,
  onConfirm,
  isLoading = false,
  tone = "danger",
  requireText = "",
  requireTextHint = "",
  error = "",
  children,
}) {
  const [typed, setTyped] = useState("");
  const styles = TONES[tone] || TONES.danger;
  const blocked = Boolean(requireText) && typed.trim() !== requireText.trim();

  const handleOpenChange = (next) => {
    if (!next) setTyped("");
    onOpenChange?.(next);
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      titleClassName="text-base font-bold text-slate-900"
      subtitle={description}
      icon={<AlertTriangle size={18} className={cn("shrink-0", styles.icon)} />}
      iconWrapperClassName={cn("h-10 w-10 rounded-xl border shadow-2xs", styles.iconWrapper)}
      maxWidth="sm:max-w-[440px]"
      className="gap-5"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          {/* Nút hành động nằm bên TRÁI */}
          <Button
            type="button"
            variant="outline"
            disabled={isLoading || blocked}
            onClick={() => onConfirm?.()}
            className={cn(
              "h-9.5 px-4 rounded-xl text-xs font-semibold gap-1.5 border transition-all cursor-pointer shadow-xs active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45",
              styles.confirm
            )}
          >
            {ConfirmIcon && <ConfirmIcon size={14} className="shrink-0" />}
            <span>{confirmText}</span>
          </Button>

          {/* Nút an toàn (Giữ lại/Hủy) nằm bên PHẢI, màu trung tính để nút hành động đỏ nổi bật */}
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={() => handleOpenChange(false)}
            className="h-9.5 min-w-[95px] px-5 rounded-xl text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer active:scale-[0.98] transition-all justify-center"
          >
            <span>{cancelText}</span>
          </Button>
        </div>
      }
    >
      {(children || requireText || error) && (
        <div className="flex flex-col gap-2">
          {children}
          {requireText && (
            <>
              {requireTextHint && (
                <p className={cn("text-xs font-semibold", styles.hint)}>
                  {requireTextHint}{" "}
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-slate-900 select-all">{requireText}</span>
                </p>
              )}
              <Input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={requireText}
                autoComplete="off"
                className={cn("h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm", styles.focus)}
              />
            </>
          )}
          {error && <p role="alert" className="text-xs font-medium text-rose-600">{error}</p>}
        </div>
      )}
    </BaseModal>
  );
}

export default ConfirmModal;
