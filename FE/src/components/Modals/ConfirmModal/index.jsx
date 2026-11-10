import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import BaseModal from "~/components/Modals/BaseModal";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

const TONES = {
  danger: {
    icon: "text-rose-600",
    iconWrapper: "bg-rose-50 border-rose-200/80 text-rose-600",
    confirm: "text-rose-600 border-rose-200/90 bg-rose-50/80 hover:bg-rose-100 hover:text-rose-700 hover:border-rose-300",
  },
  warning: {
    icon: "text-amber-600",
    iconWrapper: "bg-amber-50 border-amber-200/80 text-amber-600",
    confirm: "text-amber-700 border-amber-300/90 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 hover:border-amber-400",
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
              "h-9.5 px-4 rounded-xl text-xs font-semibold gap-1.5 border transition-all cursor-pointer shadow-2xs active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
              styles.confirm
            )}
          >
            {ConfirmIcon && <ConfirmIcon size={14} className="shrink-0" />}
            <span>{confirmText}</span>
          </Button>

          {/* Nút an toàn (Giữ lại/Hủy) nằm bên PHẢI với tông màu thương hiệu Indigo chuẩn Who's Free */}
          <Button
            type="button"
            disabled={isLoading}
            onClick={() => handleOpenChange(false)}
            className="h-9.5 min-w-[95px] px-5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer active:scale-[0.98] transition-all justify-center"
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
              {requireTextHint && <p className="text-xs text-slate-600">{requireTextHint}</p>}
              <Input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={requireText}
                autoComplete="off"
                className="h-10 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm"
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
