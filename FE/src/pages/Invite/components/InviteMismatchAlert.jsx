import { AlertCircle, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";

/**
 * InviteMismatchAlert - Cảnh báo khi tài khoản đăng nhập không khớp với email được mời
 */
export function InviteMismatchAlert({ invitedEmail, currentEmail, onSwitchAccount }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-2">
        <div className="flex items-center gap-1.5 font-semibold text-amber-800">
          <AlertCircle size={15} className="text-amber-600 shrink-0" />
          <span>
            {t("invitePage.emailMismatchTitle", { defaultValue: "Tài khoản không khớp" })}
          </span>
        </div>
        <p className="text-[11px] text-amber-700 leading-relaxed">
          {t("invitePage.emailMismatchDesc", {
            invitedEmail,
            currentEmail,
            defaultValue: `Lời mời này được gửi tới email ${invitedEmail}, nhưng bạn đang đăng nhập với tài khoản ${currentEmail}.`,
          })}
        </p>
      </div>

      <Button
        type="button"
        onClick={onSwitchAccount}
        className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer gap-2 shadow-xs transition-colors"
      >
        <LogOut size={14} />
        <span>
          {t("invitePage.switchAccount", { defaultValue: "Đổi sang tài khoản đúng" })}
        </span>
      </Button>
    </div>
  );
}

export default InviteMismatchAlert;
