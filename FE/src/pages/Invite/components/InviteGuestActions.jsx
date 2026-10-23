import { useNavigate } from "react-router";
import { LogIn } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";

/**
 * InviteGuestActions - Giao diện đăng nhập khi người dùng chưa có phiên (lời mời chỉ có một nút Đăng nhập)
 */
export function InviteGuestActions({ invitedEmail, token }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const returnUrl = `/invite/${token}`;

  return (
    <div className="space-y-4">
      <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-600 space-y-1">
        <p className="font-semibold text-slate-800">
          {t("invitePage.dedicatedFor", { defaultValue: "Lời mời dành riêng cho:" })}
        </p>
        <p className="font-mono text-indigo-600 font-semibold text-xs truncate">
          {invitedEmail}
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          {t("invitePage.loginRequiredNote", {
            defaultValue:
              "Vui lòng đăng nhập bằng email trên để chấp nhận lời mời.",
          })}
        </p>
      </div>

      <Button
        type="button"
        onClick={() =>
          navigate(
            `/auth/login?email=${encodeURIComponent(invitedEmail || "")}&returnUrl=${encodeURIComponent(returnUrl)}`
          )
        }
        className="h-10 w-full rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer gap-1.5"
      >
        <LogIn size={14} />
        <span>{t("auth.login", { defaultValue: "Đăng nhập" })}</span>
      </Button>
    </div>
  );
}

export default InviteGuestActions;
