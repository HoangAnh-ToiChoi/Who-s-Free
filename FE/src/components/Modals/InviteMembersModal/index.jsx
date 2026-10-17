import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  UserPlus,
  Check,
  Mail,
  Send,
  Shield,
  ChevronDown,
  ArrowRight,
  Loader2,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Link2,
  AlertTriangle,
} from "lucide-react";

import BaseModal from "~/components/Modals/BaseModal";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "~/components/ui/alert-dialog";
import { useGroupInvites, useClickOutside } from "~/hooks";
import { groupService } from "~/service/groupService/groupService";
import { cn } from "~/lib/utils";

const ROLE_OPTIONS = [
  { id: "member", labelKey: "roleMember" },
  { id: "lead", labelKey: "roleLead" },
];

function InviteMembersModal({ open, onOpenChange, group }) {
  const { t } = useTranslation();
  const groupId = group?.id;
  const groupName = group?.name || "";
  const normalizedUserRole = (group?.userRole || group?.role || "").toLowerCase();
  const isOwner = normalizedUserRole === "owner";
  const canInvite = normalizedUserRole === "owner" || normalizedUserRole === "lead";

  // --- Email invite state (unchanged) ---
  const {
    pendingInvites,
    isLoading,
    isSending,
    resendingId,
    revokingId,
    emailError,
    successMessage,
    loadError,
    setEmailError,
    sendInvite,
    resendInvite,
    revokeInvite,
    reload,
  } = useGroupInvites(groupId, open);

  const [emailInput, setEmailInput] = useState("");
  const [selectedRole, setSelectedRole] = useState("member");
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const roleDropdownRef = useRef(null);

  useClickOutside(roleDropdownRef, () => setRoleMenuOpen(false));

  const availableRoles = useMemo(() => {
    return isOwner
      ? ROLE_OPTIONS
      : ROLE_OPTIONS.filter((r) => r.id === "member");
  }, [isOwner]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!emailInput.trim() || isSending) return;
    const success = await sendInvite(emailInput, selectedRole);
    if (success) setEmailInput("");
  };

  const selectedRoleOption =
    availableRoles.find((r) => r.id === selectedRole) || availableRoles[0];

  // --- Invite link state ---
  const [inviteLinkData, setInviteLinkData] = useState(null);
  const [isLoadingLink, setIsLoadingLink] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadInviteLink = useCallback(async () => {
    if (!groupId || !canInvite) return;
    try {
      setIsLoadingLink(true);
      const data = await groupService.getGroupInviteLink(groupId);
      setInviteLinkData(data?.token ? data : null);
    } catch {
      setInviteLinkData(null);
    } finally {
      setIsLoadingLink(false);
    }
  }, [groupId, canInvite]);

  useEffect(() => {
    if (open) {
      loadInviteLink();
    } else {
      setInviteLinkData(null);
      setCopied(false);
      setIsConfirmOpen(false);
    }
  }, [open, loadInviteLink]);

  const activeToken = inviteLinkData?.token;
  const inviteLink = activeToken
    ? `${window.location.origin}/join/${activeToken}`
    : "";

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCreateOrReset = async () => {
    if (!groupId || isGenerating) return;
    try {
      setIsGenerating(true);
      const data = await groupService.createGroupInviteLink(groupId);
      setInviteLinkData(data);
      setIsConfirmOpen(false);
    } catch {
      // ignore
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRequestGenerate = () => {
    if (activeToken) setIsConfirmOpen(true);
    else handleCreateOrReset();
  };

  return (
    <>
      <BaseModal
        open={open}
        onOpenChange={onOpenChange}
        title={t("inviteModal.title")}
        subtitle={t("inviteModal.subtitle", { groupName })}
        icon={<UserPlus size={18} strokeWidth={2.2} />}
        maxWidth="sm:max-w-[560px]"
        className="p-7 sm:p-8 border-slate-200/90"
        footer={
          <>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer group"
            >
              <span>{t("inviteModal.managePermissions")}</span>
              <ArrowRight
                size={13}
                className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600"
              />
            </button>

            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="h-9 px-5 rounded-xl text-xs font-medium border-indigo-200/90 bg-white text-slate-700 hover:bg-slate-50 hover:border-indigo-400 cursor-pointer shadow-2xs"
            >
              {t("inviteModal.done")}
            </Button>
          </>
        }
      >
        {/* Section 1: Invite via email */}
        <div>
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase select-none">
            {t("inviteModal.inviteEmailHeader")}
          </span>

          {!canInvite ? (
            <div className="mt-2 flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
              <Shield size={16} className="text-slate-400 shrink-0" />
              <span>{t("inviteModal.errorForbidden", { defaultValue: "Chỉ Quản trị viên (Lead hoặc Owner) mới có quyền mời thành viên vào nhóm." })}</span>
            </div>
          ) : (
            <>
              <form onSubmit={handleSend} className="mt-2 flex items-center gap-2 min-w-0">
                <div className="relative flex-1 min-w-0">
                  <Mail
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <Input
                    type="email"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      if (emailError) setEmailError("");
                    }}
                    placeholder={t("inviteModal.emailPlaceholder")}
                    className={cn(
                      "pl-8.5 h-10 text-xs rounded-xl transition-colors",
                      emailError
                        ? "border-rose-500 bg-rose-50/40 ring-1 ring-rose-500/50"
                        : "border-slate-200 bg-slate-50/50 focus:bg-white"
                    )}
                  />
                </div>

                <div className="relative shrink-0" ref={roleDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setRoleMenuOpen((prev) => !prev)}
                    disabled={availableRoles.length <= 1}
                    className={cn(
                      "h-10 flex items-center gap-1.5 px-3 border border-slate-200 bg-white text-slate-700 text-xs font-medium rounded-xl transition-colors select-none whitespace-nowrap",
                      availableRoles.length > 1
                        ? "hover:bg-slate-50 cursor-pointer"
                        : "opacity-80 cursor-default"
                    )}
                  >
                    <span>
                      {t("inviteModal.rolePrefix")}{" "}
                      {t(`inviteModal.${selectedRoleOption.labelKey}`)}
                    </span>
                    {availableRoles.length > 1 && (
                      <ChevronDown size={14} className="text-slate-400" />
                    )}
                  </button>

                  {roleMenuOpen && availableRoles.length > 1 && (
                    <div className="absolute right-0 top-full mt-1.5 w-36 rounded-xl border border-slate-200/90 bg-white p-1 shadow-lg z-50 animate-in fade-in-0 zoom-in-95">
                      {availableRoles.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setSelectedRole(opt.id);
                            setRoleMenuOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer",
                            selectedRole === opt.id
                              ? "bg-indigo-50 text-indigo-700 font-semibold"
                              : "text-slate-700 hover:bg-slate-100"
                          )}
                        >
                          <span>{t(`inviteModal.${opt.labelKey}`)}</span>
                          {selectedRole === opt.id && (
                            <Check size={13} className="text-indigo-600 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSending || !emailInput.trim()}
                  className="h-10 px-3.5 rounded-xl text-xs font-semibold gap-1.5 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs hover:shadow-md hover:shadow-indigo-500/20 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap min-w-20 justify-center disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <Loader2 size={13} className="animate-spin shrink-0" />
                      <span>{t("inviteModal.sending")}</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} className="shrink-0" />
                      <span>{t("inviteModal.send")}</span>
                    </>
                  )}
                </Button>
              </form>

              {emailError && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
                  <AlertCircle size={14} className="shrink-0 text-rose-500" />
                  <span className="font-medium">{t(emailError, { defaultValue: emailError })}</span>
                </div>
              )}

              {successMessage && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                  <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                  <span className="font-medium">{t(successMessage, { defaultValue: successMessage })}</span>
                </div>
              )}

              <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                <Shield size={13} className="text-slate-400 shrink-0" />
                <span className="truncate">{t("inviteModal.expiryNote")}</span>
              </div>
            </>
          )}
        </div>

        {/* Section 2: Pending invites */}
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
                  onClick={reload}
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
                        onClick={() => resendInvite(invite.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors cursor-pointer disabled:opacity-50"
                        title={t("inviteModal.resend")}
                      >
                        <RefreshCw size={11} className={cn(isResending && "animate-spin")} />
                        <span>{isResending ? t("inviteModal.resending") : t("inviteModal.resend")}</span>
                      </button>
                      <button
                        type="button"
                        disabled={isResending || isRevoking}
                        onClick={() => revokeInvite(invite.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-rose-600 px-1.5 py-1 rounded-md hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                        title={t("inviteModal.revoke", { defaultValue: "Thu hồi" })}
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

        {/* Section 3: Invite via link (Lead/Owner only) */}
        {canInvite && (
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
                      onClick={handleCopy}
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
                    onClick={handleRequestGenerate}
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
        )}
      </BaseModal>

      {/* AlertDialog xác nhận reset link — render ngoài BaseModal để tránh portal conflict */}
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
              onClick={handleCreateOrReset}
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

export default InviteMembersModal;
