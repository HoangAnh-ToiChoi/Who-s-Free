import { useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  UserPlus, Mail, Send, Shield, ChevronDown, ArrowRight, Loader2, Check,
} from "lucide-react";

import BaseModal from "~/components/Modals/BaseModal";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useGroupInvites, useClickOutside } from "~/hooks";
import { cn } from "~/lib/utils";

import { useInviteLink } from "./useInviteLink";
import { PendingInvitesList } from "./PendingInvitesList";
import { InviteLinkSection } from "./InviteLinkSection";

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

  const {
    pendingInvites, isLoading, isSending, resendingId, revokingId,
    emailError, successMessage, loadError, setEmailError,
    sendInvite, resendInvite, revokeInvite, reload,
  } = useGroupInvites(groupId, open);

  const [emailInput, setEmailInput] = useState("");
  const [selectedRole, setSelectedRole] = useState("member");
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const roleDropdownRef = useRef(null);
  useClickOutside(roleDropdownRef, () => setRoleMenuOpen(false));

  const availableRoles = useMemo(
    () => isOwner ? ROLE_OPTIONS : ROLE_OPTIONS.filter((r) => r.id === "member"),
    [isOwner]
  );
  const selectedRoleOption = availableRoles.find((r) => r.id === selectedRole) || availableRoles[0];

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!emailInput.trim() || isSending) return;
    const success = await sendInvite(emailInput, selectedRole);
    if (success) setEmailInput("");
  };

  const inviteLink = useInviteLink(groupId, canInvite, open);

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
              <ArrowRight size={13} className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
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
        {/* Email invite */}
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
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <Input
                    type="email"
                    value={emailInput}
                    onChange={(e) => { setEmailInput(e.target.value); if (emailError) setEmailError(""); }}
                    placeholder={t("inviteModal.emailPlaceholder")}
                    className={cn(
                      "pl-8.5 h-10 text-xs rounded-xl transition-colors",
                      emailError ? "border-rose-500 bg-rose-50/40 ring-1 ring-rose-500/50" : "border-slate-200 bg-slate-50/50 focus:bg-white"
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
                      availableRoles.length > 1 ? "hover:bg-slate-50 cursor-pointer" : "opacity-80 cursor-default"
                    )}
                  >
                    <span>{t("inviteModal.rolePrefix")} {t(`inviteModal.${selectedRoleOption.labelKey}`)}</span>
                    {availableRoles.length > 1 && <ChevronDown size={14} className="text-slate-400" />}
                  </button>

                  {roleMenuOpen && availableRoles.length > 1 && (
                    <div className="absolute right-0 top-full mt-1.5 w-36 rounded-xl border border-slate-200/90 bg-white p-1 shadow-lg z-50 animate-in fade-in-0 zoom-in-95">
                      {availableRoles.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => { setSelectedRole(opt.id); setRoleMenuOpen(false); }}
                          className={cn(
                            "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer",
                            selectedRole === opt.id ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-700 hover:bg-slate-100"
                          )}
                        >
                          <span>{t(`inviteModal.${opt.labelKey}`)}</span>
                          {selectedRole === opt.id && <Check size={13} className="text-indigo-600 shrink-0" />}
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
                    <><Loader2 size={13} className="animate-spin shrink-0" /><span>{t("inviteModal.sending")}</span></>
                  ) : (
                    <><Send size={13} className="shrink-0" /><span>{t("inviteModal.send")}</span></>
                  )}
                </Button>
              </form>

              {emailError && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
                  <span className="font-medium">{t(emailError, { defaultValue: emailError })}</span>
                </div>
              )}
              {successMessage && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
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

        <PendingInvitesList
          isLoading={isLoading}
          loadError={loadError}
          pendingInvites={pendingInvites}
          resendingId={resendingId}
          revokingId={revokingId}
          onResend={resendInvite}
          onRevoke={revokeInvite}
          onReload={reload}
        />

        {canInvite && (
          <InviteLinkSection
            inviteLink={inviteLink.inviteLink}
            activeToken={inviteLink.activeToken}
            isLoadingLink={inviteLink.isLoadingLink}
            isGenerating={inviteLink.isGenerating}
            isConfirmOpen={inviteLink.isConfirmOpen}
            setIsConfirmOpen={inviteLink.setIsConfirmOpen}
            copied={inviteLink.copied}
            onCopy={inviteLink.handleCopy}
            onCreateOrReset={inviteLink.handleCreateOrReset}
            onRequestGenerate={inviteLink.handleRequestGenerate}
          />
        )}
      </BaseModal>
    </>
  );
}

export default InviteMembersModal;
