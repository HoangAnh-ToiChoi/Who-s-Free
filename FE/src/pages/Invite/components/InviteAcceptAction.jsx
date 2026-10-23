import { CheckCircle2, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";

/**
 * InviteAcceptAction - Khối hành động chấp nhận lời mời khi tài khoản hợp lệ
 */
export function InviteAcceptAction({
  userEmail,
  isAccepting,
  error,
  onAccept,
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
          <AlertCircle size={15} className="text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
        <span className="text-[11px] font-medium leading-relaxed truncate">
          {t("invitePage.emailMatched", {
            email: userEmail,
            defaultValue: `Đã xác thực tài khoản: ${userEmail}`,
          })}
        </span>
      </div>

      <Button
        type="button"
        disabled={isAccepting}
        onClick={onAccept}
        className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs hover:shadow-md hover:shadow-indigo-500/20 transition-all cursor-pointer gap-2 disabled:opacity-50"
      >
        {isAccepting ? (
          <>
            <Loader2 size={14} className="animate-spin shrink-0" />
            <span>{t("invitePage.accepting", { defaultValue: "Đang tham gia nhóm..." })}</span>
          </>
        ) : (
          <>
            <span>{t("invitePage.acceptButton", { defaultValue: "Chấp nhận lời mời" })}</span>
            <ArrowRight size={14} />
          </>
        )}
      </Button>
    </div>
  );
}

export default InviteAcceptAction;
