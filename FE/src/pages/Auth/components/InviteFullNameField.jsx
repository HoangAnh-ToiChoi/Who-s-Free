import { useTranslation } from "react-i18next";
import { User, AlertCircle } from "lucide-react";
import { Input } from "~/components/ui/input";

/** Ô nhập họ tên, hiện khi người được mời chưa có tài khoản và tạo tài khoản ngay trên trang đăng nhập. */
function InviteFullNameField({ value, error, onChange }) {
  const { t } = useTranslation();

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-700">{t("auth.fullName")}</label>
      <div className="relative">
        <User
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10"
        />
        <Input
          type="text"
          value={value}
          autoComplete="name"
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("auth.fullNamePlaceholder")}
          aria-invalid={!!error}
          className={`h-11 w-full rounded-xl bg-slate-50/50 pl-10 pr-3.5 text-xs text-slate-800 placeholder:text-slate-500 transition-all focus:bg-white ${
            error
              ? "border-rose-500 bg-rose-50/40 ring-1 ring-rose-500/50 text-rose-900"
              : "border-slate-200/90 focus:border-indigo-500 focus:ring-indigo-500/20"
          }`}
        />
      </div>
      {error && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-rose-600">
          <AlertCircle size={13} className="text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default InviteFullNameField;
