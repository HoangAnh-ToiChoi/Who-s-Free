import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "~/lib/utils";

/**
 * Nút quay lại dùng chung toàn app (kiểu nút "Quay lại nhóm" ở trang ma trận): viền, cao 40px mobile / 36px desktop,
 * hover đỏ. shortLabel: nhãn ngắn hiện trên mobile (ví dụ "Quay lại"), bỏ trống thì dùng label.
 */
function BackButton({ to, label, shortLabel, className }) {
  return (
    <Link
      to={to}
      aria-label={label}
      className={cn(
        "group inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-2xs transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 sm:h-9",
        className
      )}
    >
      <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-0.5 group-hover:text-red-600 sm:size-4" />
      {shortLabel ? (
        <>
          <span className="sm:hidden">{shortLabel}</span>
          <span className="hidden sm:inline">{label}</span>
        </>
      ) : (
        <span>{label}</span>
      )}
    </Link>
  );
}

export default BackButton;
