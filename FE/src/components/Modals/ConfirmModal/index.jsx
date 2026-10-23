import { AlertTriangle, Trash2 } from "lucide-react";
import BaseModal from "~/components/Modals/BaseModal";
import { Button } from "~/components/ui/button";

/**
 * ConfirmModal - Modal xác nhận hành động nguy hiểm / xóa dữ liệu
 * Thiết kế theo chuẩn UX Facebook (chống "tay nhanh hơn não"):
 * Đảo vị trí nút:
 * - Nút Xóa (hành động nguy hiểm) nằm bên TRÁI.
 * - Nút Giữ lại / Hủy (hành động an toàn, mặc định quán tính) nằm bên PHẢI.
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
}) {
  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      titleClassName="text-base font-bold text-slate-900"
      subtitle={description}
      icon={<AlertTriangle size={18} className="text-rose-600 shrink-0" />}
      iconWrapperClassName="h-10 w-10 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-600 shadow-2xs"
      maxWidth="sm:max-w-[440px]"
      className="gap-5"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          {/* Nút hành động nguy hiểm (Xóa) nằm bên TRÁI */}
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={() => {
              onConfirm?.();
            }}
            className="h-9.5 px-4 rounded-xl text-xs font-semibold gap-1.5 text-rose-600 border border-rose-200/90 bg-rose-50/80 hover:bg-rose-100 hover:text-rose-700 hover:border-rose-300 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
          >
            {ConfirmIcon && <ConfirmIcon size={14} className="shrink-0" />}
            <span>{confirmText}</span>
          </Button>

          {/* Nút an toàn (Giữ lại/Hủy) nằm bên PHẢI với tông màu thương hiệu Indigo chuẩn Who's Free */}
          <Button
            type="button"
            disabled={isLoading}
            onClick={() => onOpenChange(false)}
            className="h-9.5 min-w-[95px] px-5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer active:scale-[0.98] transition-all justify-center"
          >
            <span>{cancelText}</span>
          </Button>
        </div>
      }
    />
  );
}

export default ConfirmModal;
