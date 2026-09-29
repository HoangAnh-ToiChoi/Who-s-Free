import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "~/components/ui/dialog";
import { X } from "lucide-react";
import { cn } from "~/lib/utils";

/**
 * BaseModal - Component khung modal dùng chung cho toàn bộ dự án
 * 
 * Đảm bảo 100% giao diện nhất quán, mượt mà và không lặp lại mã nguồn khung:
 * - Tự động quản lý Dialog, DialogContent, Backdrop Blur và Animations
 * - Header chuẩn hóa: Icon badge, Title, Subtitle, Nút đóng X
 * - Khung body linh hoạt nhận {children}
 * - Khung footer nhận {footer} (tuỳ chọn)
 */
function BaseModal({
  open,
  onOpenChange,
  title,
  subtitle,
  icon,
  iconWrapperClassName,
  titleClassName,
  headerClassName,
  closeButtonClassName,
  closeIconSize = 18,
  className,
  children,
  footer,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "w-full rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl overflow-visible",
          className
        )}
      >
        {/* Header */}
        <div className={cn("flex items-start justify-between gap-4", headerClassName)}>
          <div className="flex items-center gap-3">
            {icon && (
              <div
                className={cn(
                  "flex shrink-0 items-center justify-center",
                  iconWrapperClassName ||
                    "h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-600"
                )}
              >
                {icon}
              </div>
            )}
            <div>
              {title && (
                <DialogTitle
                  className={cn(
                    "font-bold text-slate-900 leading-tight",
                    titleClassName || "text-base"
                  )}
                >
                  {title}
                </DialogTitle>
              )}
              {subtitle && (
                <p className="mt-0.5 text-xs text-slate-500 leading-normal">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={() => onOpenChange?.(false)}
            className={cn(
              "flex shrink-0 items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer transition-colors",
              closeButtonClassName || "-mr-1 -mt-1 h-8 w-8 rounded-xl hover:bg-slate-100"
            )}
            aria-label="Close"
          >
            <X size={closeIconSize} strokeWidth={2.2} />
          </button>
        </div>

        {/* Modal Body */}
        {children}

        {/* Optional Footer */}
        {footer && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default BaseModal;
