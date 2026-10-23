import { ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";

/**
 * JoinAction - Nút bấm tham gia nhóm cho tài khoản đã xác thực
 * Không yêu cầu so khớp email (khác với luồng Invite qua email cá nhân)
 */
export function JoinAction({ isJoining, error, onJoin }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
          <AlertCircle size={15} className="text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="button"
        disabled={isJoining}
        onClick={onJoin}
        className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs hover:shadow-md hover:shadow-indigo-500/20 transition-all cursor-pointer gap-2 disabled:opacity-50"
      >
        {isJoining ? (
          <>
            <Loader2 size={14} className="animate-spin shrink-0" />
            <span>{t("joinPage.joining", { defaultValue: "Đang tham gia nhóm..." })}</span>
          </>
        ) : (
          <>
            <span>{t("joinPage.joinButton", { defaultValue: "Tham gia nhóm" })}</span>
            <ArrowRight size={14} />
          </>
        )}
      </Button>
    </div>
  );
}

export default JoinAction;
