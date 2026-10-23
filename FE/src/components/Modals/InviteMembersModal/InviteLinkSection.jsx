import { useTranslation } from "react-i18next";
import { Link2, Check, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "~/components/ui/alert-dialog";
import { cn } from "~/lib/utils";

export function InviteLinkSection({
  inviteLink,
  activeToken,
  isLoadingLink,
  isGenerating,
  isConfirmOpen,
  setIsConfirmOpen,
  copied,
  onCopy,
  onCreateOrReset,
  onRequestGenerate,
}) {
  const { t } = useTranslation();

  return (
    <>
      <div className="mt-4 rounded-xl border border-slate-100/90 bg-slate-50/80 p-3.5">
        <div className="flex items-center gap-1.5 mb-3">
          <Link2 size={13} className="text-indigo-600 shrink-0" />
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase select-none">
            {t("inviteModal.inviteLinkHeader", { defaultValue: "Mời qua liên kết" })}
          </span>
        </div>

        {isLoadingLink ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="size-4 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                placeholder={t("inviteModal.noInviteLink", { defaultValue: "Chưa có liên kết đang hoạt động" })}
                className="flex-1 h-9 rounded-lg border border-slate-200 bg-white px-3 font-mono text-[11px] text-slate-600 select-all focus:outline-none placeholder:text-slate-400 min-w-0"
              />
              {activeToken && (
                <Button
                  type="button"
                  onClick={onCopy}
                  className={cn(
                    "h-9 px-3 rounded-lg text-xs font-semibold gap-1.5 shrink-0 cursor-pointer transition-all",
                    copied
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  )}
                >
                  {copied ? <Check size={13} /> : <Link2 size={13} />}
                  <span>
                    {copied
                      ? t("groupDetail.copied", { defaultValue: "Đã chép" })
                      : t("groupDetail.copyInviteLink", { defaultValue: "Sao chép" })}
                  </span>
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                disabled={isGenerating}
                onClick={onRequestGenerate}
                className="h-9 px-3 rounded-lg border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer gap-1.5 shrink-0"
              >
                {isGenerating
                  ? <Loader2 size={12} className="animate-spin text-slate-500" />
                  : <RefreshCw size={12} className="text-slate-500" />}
                <span>
                  {activeToken
                    ? t("groupDetail.resetInviteLink", { defaultValue: "Làm mới" })
                    : t("groupDetail.createInviteLink", { defaultValue: "Tạo link" })}
                </span>
              </Button>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {t("groupDetail.inviteLinkHelp", { defaultValue: "Ai có link này đều có thể tham gia nhóm với vai trò Thành viên (hạn 24 giờ)." })}
            </p>
          </div>
        )}
      </div>

      {/* Render ngoài BaseModal để tránh portal conflict */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className="p-6 rounded-2xl max-w-md bg-white border border-slate-200 shadow-xl">
          <AlertDialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle size={18} />
              <AlertDialogTitle className="text-base font-bold text-slate-900">
                {t("groupDetail.resetInviteLinkTitle", { defaultValue: "Vô hiệu hóa link hiện tại?" })}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed">
              {t("groupDetail.resetInviteLinkDesc", { defaultValue: "Tạo liên kết mới sẽ vô hiệu hóa liên kết hiện tại ngay lập tức. Bất kỳ ai sử dụng liên kết cũ sẽ không thể tham gia nhóm được nữa." })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 bg-transparent p-0">
            <Button
              type="button"
              disabled={isGenerating}
              onClick={onCreateOrReset}
              className="h-10 px-4 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50/80 border border-rose-200/90 hover:bg-rose-100 hover:text-rose-700 transition-colors cursor-pointer"
            >
              {isGenerating && <Loader2 size={13} className="animate-spin text-rose-600 mr-1.5" />}
              <span>{t("groupDetail.confirmReset", { defaultValue: "Tạo mới ngay" })}</span>
            </Button>
            <Button
              type="button"
              onClick={() => setIsConfirmOpen(false)}
              className="h-10 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
            >
              <span>{t("groupDetail.cancel", { defaultValue: "Hủy bỏ" })}</span>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
