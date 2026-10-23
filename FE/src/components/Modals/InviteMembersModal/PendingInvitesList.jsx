import { useTranslation } from "react-i18next";
import { Loader2, RefreshCw, AlertCircle, Trash2 } from "lucide-react";
import { cn } from "~/lib/utils";

export function PendingInvitesList({
  isLoading,
  loadError,
  pendingInvites,
  resendingId,
  revokingId,
  onResend,
  onRevoke,
  onReload,
}) {
  const { t } = useTranslation();

  return (
    <div className="mt-4 rounded-xl border border-slate-100/90 bg-slate-50/80 p-3.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-800">
          {t("inviteModal.pendingHeader")}
        </span>
        <span className="text-[11px] text-slate-500">
          {t("inviteModal.awaitingCount", { count: pendingInvites.length })}
        </span>
      </div>

      {loadError && (
        <div
          role="alert"
          className={cn(
            "mt-2 flex items-center justify-between gap-2 text-xs p-2.5 rounded-lg border",
            loadError.type === "FORBIDDEN"
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-rose-50 border-rose-200 text-rose-700"
          )}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertCircle size={14} className="shrink-0" />
            <span className="font-medium">{t(loadError.messageKey || loadError)}</span>
          </div>
          {loadError.canRetry && (
            <button
              type="button"
              onClick={onReload}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:text-rose-900 bg-white border border-rose-200 px-2 py-1 rounded-md hover:bg-rose-100/60 transition-colors cursor-pointer shrink-0 shadow-2xs"
            >
              <RefreshCw size={11} />
              <span>{t("common.tryAgain", { defaultValue: "Thử lại" })}</span>
            </button>
          )}
        </div>
      )}

      <div className="mt-2.5 space-y-2 max-h-48 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-500" role="status">
            <Loader2 size={14} className="animate-spin" />
            <span>{t("common.loading", { defaultValue: "Đang tải..." })}</span>
          </div>
        ) : pendingInvites.length === 0 ? (
          <p className="text-[11px] text-slate-400 italic py-1">
            {t("inviteModal.noPendingInvites", { defaultValue: "Chưa có lời mời nào đang chờ" })}
          </p>
        ) : (
          pendingInvites.map((invite) => {
            const isResending = resendingId === invite.id;
            const isRevoking = revokingId === invite.id;
            const roleBadge = invite.role === "lead"
              ? t("inviteModal.roleLead")
              : t("inviteModal.roleMember");

            return (
              <div
                key={invite.id}
                className="flex items-center justify-between text-xs py-1.5 px-2 bg-white rounded-lg border border-slate-200/60"
              >
                <div className="flex items-center gap-2 truncate pr-2 min-w-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                  <span className="font-medium text-slate-700 truncate">{invite.email}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 shrink-0 border border-indigo-100">
                    {roleBadge}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {t("inviteModal.expiresIn24h", { defaultValue: "Hạn 24h" })}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={isResending || isRevoking}
                    onClick={() => onResend(invite.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={11} className={cn(isResending && "animate-spin")} />
                    <span>{isResending ? t("inviteModal.resending") : t("inviteModal.resend")}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isResending || isRevoking}
                    onClick={() => onRevoke(invite.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-rose-600 px-1.5 py-1 rounded-md hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
