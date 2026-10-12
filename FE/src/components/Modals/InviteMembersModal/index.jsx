import { useState, useRef, useMemo } from "react";
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
} from "lucide-react";

import BaseModal from "~/components/Modals/BaseModal";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useGroupInvites, useClickOutside } from "~/hooks";
import { cn } from "~/lib/utils";

const ROLE_OPTIONS = [
  { id: "member", labelKey: "roleMember" },
  { id: "lead", labelKey: "roleLead" },
];

/**
 * Modal Mời Thành Viên (Invite Members Modal)
 * Kế thừa BaseModal, tối ưu hiệu năng & chuẩn giao diện Who's Free
 */
function InviteMembersModal({ open, onOpenChange, group }) {
  const { t } = useTranslation();
  const groupId = group?.id;
  const groupName = group?.name || "";
  const normalizedUserRole = (group?.userRole || group?.role || "").toLowerCase();
  const isOwner = normalizedUserRole === "owner";
  const canInvite = normalizedUserRole === "owner" || normalizedUserRole === "lead";

  // Sử dụng Domain Hook đóng gói toàn bộ logic gọi API và trạng thái
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

  // Lọc vai trò được phép chọn: Chỉ Owner mới có thể mời vai trò Lead
  const availableRoles = useMemo(() => {
    return isOwner
      ? ROLE_OPTIONS
      : ROLE_OPTIONS.filter((r) => r.id === "member");
  }, [isOwner]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!emailInput.trim() || isSending) return;

    const success = await sendInvite(emailInput, selectedRole);
    if (success) {
      setEmailInput("");
    }
  };

  const selectedRoleOption =
    availableRoles.find((r) => r.id === selectedRole) || availableRoles[0];

  return (
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
      {/* Invitation is email-bound; the backend emails a one-time token link. */}
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
              {/* Email Input */}
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

              {/* Role Dropdown Selector */}
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

              {/* Send Button */}
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

            {/* Validation & API Error Message */}
            {emailError && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
                <AlertCircle size={14} className="shrink-0 text-rose-500" />
                <span className="font-medium">{t(emailError, { defaultValue: emailError })}</span>
              </div>
            )}

            {/* Success Notification */}
            {successMessage && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                <span className="font-medium">{t(successMessage, { defaultValue: successMessage })}</span>
              </div>
            )}

            {/* Security & 24h Expiry Note */}
            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
              <Shield size={13} className="text-slate-400 shrink-0" />
              <span className="truncate">{t("inviteModal.expiryNote")}</span>
            </div>
          </>
        )}
      </div>

      {/* Section 3: Recent Pending Invites Card */}
      <div className="mt-4 rounded-xl border border-slate-100/90 bg-slate-50/80 p-3.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-800">
            {t("inviteModal.pendingHeader")}
          </span>
          <span className="text-[11px] text-slate-500">
            {t("inviteModal.awaitingCount", {
              count: pendingInvites.length,
            })}
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

        {/* List of Pending Invites */}
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
                    <span className="font-medium text-slate-700 truncate">
                      {invite.email}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 shrink-0 border border-indigo-100">
                      {roleBadge}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {t("inviteModal.expiresIn24h", { defaultValue: "Hạn 24h" })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Nút Gửi lại */}
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

                    {/* Nút Thu hồi (Facebook style hover đỏ) */}
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
    </BaseModal>
  );
}

export default InviteMembersModal;
