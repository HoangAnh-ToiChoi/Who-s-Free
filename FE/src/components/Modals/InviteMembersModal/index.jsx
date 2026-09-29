import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  UserPlus,
  Link as LinkIcon,
  Copy,
  Check,
  Mail,
  Send,
  Shield,
  ChevronDown,
  ArrowRight,
  Loader2,
} from "lucide-react";

import BaseModal from "~/components/Modals/BaseModal";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useGroupInvites, useClickOutside } from "~/hooks";
import { cn } from "~/lib/utils";

const ROLE_OPTIONS = [
  { id: "Member", labelKey: "roleMember" },
  { id: "Admin", labelKey: "roleAdmin" },
  { id: "Viewer", labelKey: "roleViewer" },
];

/**
 * Modal Mời Thành Viên (Invite Members Modal)
 * Kế thừa BaseModal, tối ưu hiệu năng & chuẩn giao diện
 */
function InviteMembersModal({ open, onOpenChange, group }) {
  const { t } = useTranslation();
  const groupId = group?.id || "ws-1";
  const groupName = group?.name || "Club Robotics & AI";

  // Sử dụng Domain Hook đóng gói toàn bộ logic gọi API và trạng thái
  const {
    inviteLink,
    pendingInvites,
    isLoading,
    isSending,
    resendingId,
    copied,
    emailError,
    setEmailError,
    copyLink,
    sendInvite,
    resendInvite,
  } = useGroupInvites(groupId, open);

  const [emailInput, setEmailInput] = useState("");
  const [selectedRole, setSelectedRole] = useState("Member");
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const roleDropdownRef = useRef(null);

  useClickOutside(roleDropdownRef, () => setRoleMenuOpen(false));

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!emailInput.trim() || isSending) return;

    const success = await sendInvite(emailInput, selectedRole);
    if (success) {
      setEmailInput("");
    }
  };

  const selectedRoleOption =
    ROLE_OPTIONS.find((r) => r.id === selectedRole) || ROLE_OPTIONS[0];

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("inviteModal.title")}
      subtitle={t("inviteModal.subtitle", { groupName })}
      icon={<UserPlus size={18} strokeWidth={2.2} />}
      iconWrapperClassName="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/80 shadow-2xs"
      className="p-7 sm:p-8 sm:max-w-[520px] border-slate-200/90"
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
      {/* Section 1: SHARE INVITATION LINK */}
      <div className="mt-1">
        <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase select-none">
          {t("inviteModal.shareLinkHeader")}
        </span>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">
          {t("inviteModal.shareLinkDesc")}
        </p>

        <div className="mt-2.5 flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 h-10 bg-slate-50/90 border border-slate-200/80 rounded-xl text-xs text-slate-700 font-mono overflow-hidden">
            <LinkIcon size={14} className="text-slate-400 shrink-0" />
            <span className="truncate select-all">
              {isLoading ? "Generating link..." : inviteLink || "https://whosfree.app/join/..."}
            </span>
          </div>

          <Button
            type="button"
            onClick={copyLink}
            disabled={isLoading || !inviteLink}
            className={cn(
              "h-10 px-4 rounded-xl text-xs font-semibold gap-1.5 shrink-0 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap min-w-[105px] justify-center",
              copied
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs hover:shadow-md hover:shadow-indigo-500/20"
            )}
          >
            {copied ? (
              <>
                <Check size={14} className="shrink-0 stroke-[2.5]" />
                <span>{t("inviteModal.copied")}</span>
              </>
            ) : (
              <>
                <Copy size={14} className="shrink-0" />
                <span>{t("inviteModal.copyLink")}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Divider: or send direct invitation */}
      <div className="relative my-4 flex items-center justify-center">
        <div className="w-full border-t border-slate-200/70" />
        <span className="absolute bg-white px-3 text-[11px] font-medium text-slate-400 lowercase select-none">
          {t("inviteModal.orDirect")}
        </span>
      </div>

      {/* Section 2: INVITE BY EMAIL */}
      <div>
        <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase select-none">
          {t("inviteModal.inviteEmailHeader")}
        </span>

        <form onSubmit={handleSend} className="mt-2 flex items-center gap-2">
          {/* Email Input */}
          <div className="relative flex-1">
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
              className="pl-8.5 h-10 text-xs border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white transition-colors"
            />
          </div>

          {/* Role Dropdown Selector */}
          <div className="relative shrink-0" ref={roleDropdownRef}>
            <button
              type="button"
              onClick={() => setRoleMenuOpen((prev) => !prev)}
              className="h-10 flex items-center gap-1.5 px-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-xl transition-colors cursor-pointer select-none whitespace-nowrap"
            >
              <span>
                {t("inviteModal.rolePrefix")}{" "}
                {t(`inviteModal.${selectedRoleOption.labelKey}`)}
              </span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-36 rounded-xl border border-slate-200/90 bg-white p-1 shadow-lg z-50 animate-in fade-in-0 zoom-in-95">
                {ROLE_OPTIONS.map((opt) => (
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
            className="h-10 px-3.5 rounded-xl text-xs font-semibold gap-1.5 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs hover:shadow-md hover:shadow-indigo-500/20 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap min-w-[80px] justify-center disabled:opacity-50"
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

        {/* Validation Error Message */}
        {emailError && (
          <p className="mt-1 text-[11px] text-red-500 font-medium">
            {t(emailError)}
          </p>
        )}

        {/* Security Note */}
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
          <Shield size={13} className="text-slate-400 shrink-0" />
          <span className="truncate">{t("inviteModal.expiryNote")}</span>
        </div>
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

        {/* List of Pending Invites */}
        <div className="mt-2.5 space-y-2">
          {pendingInvites.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic py-1">
              Chưa có lời mời nào đang chờ
            </p>
          ) : (
            pendingInvites.map((invite) => {
              const isResending = resendingId === invite.id;
              return (
                <div
                  key={invite.id}
                  className="flex items-center justify-between text-xs py-0.5"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                    <span className="font-medium text-slate-700 truncate">
                      {invite.email}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {invite.invitedAt}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isResending}
                    onClick={() => resendInvite(invite.id)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {isResending
                      ? t("inviteModal.resending")
                      : t("inviteModal.resend")}
                  </button>
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
