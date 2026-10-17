import { useNavigate } from "react-router";
import { LogIn } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";

/**
 * JoinGuestActions - Hướng dẫn đăng nhập khi người dùng chưa có phiên làm việc
 * Trỏ returnUrl về /join/:token để tự động quay lại sau khi đăng nhập thành công
 */
export function JoinGuestActions({ token }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const returnUrl = `/join/${token}`;

  return (
    <div className="space-y-4">
      <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-600 space-y-1">
        <p className="font-semibold text-slate-800">
          {t("joinPage.loginRequiredTitle", { defaultValue: "Đăng nhập để tham gia" })}
        </p>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          {t("joinPage.loginRequiredDesc", {
            defaultValue: "Vui lòng đăng nhập để tham gia vào không gian nhóm này.",
          })}
        </p>
      </div>

      <Button
        type="button"
        onClick={() =>
          navigate(`/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`)
        }
        className="w-full h-11 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs hover:shadow-md hover:shadow-indigo-500/20 transition-all cursor-pointer gap-2"
      >
        <LogIn size={14} />
        <span>{t("auth.login", { defaultValue: "Đăng nhập" })}</span>
      </Button>
    </div>
  );
}

export default JoinGuestActions;
