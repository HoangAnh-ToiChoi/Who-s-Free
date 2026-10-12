import { useState, useEffect, useCallback } from "react";
import { groupService } from "~/service/groupService/groupService";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Custom Hook quản lý toàn bộ vòng đời, trạng thái và tác vụ mời thành viên nhóm qua email.
 * Đóng gói sạch sẽ logic gọi API, kiểm tra email và clipboard.
 *
 * @param {string} groupId - ID của nhóm
 * @param {boolean} isOpen - Trạng thái hiển thị modal
 */
export function useGroupInvites(groupId, isOpen = false) {
  const [pendingInvites, setPendingInvites] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const [revokingId, setRevokingId] = useState(null);
  const [emailError, setEmailError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loadError, setLoadError] = useState(null);

  // Chỉ fetch dữ liệu khi modal được kích hoạt mở
  const fetchInviteData = useCallback(async () => {
    if (!groupId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const invitations = await groupService.getPendingInvitations(groupId);
      setPendingInvites(Array.isArray(invitations) ? invitations : []);
    } catch (err) {
      console.error("Failed to load group invite info:", err);
      const status = err?.status;
      const code = err?.code;
      if (code === "INVITATION_FEATURE_NOT_CONFIGURED") {
        setLoadError({
          type: "CONFIGURATION_ERROR",
          messageKey: "inviteModal.errorFeatureUnavailable",
          canRetry: true,
        });
      } else if (status === 401) {
        setLoadError({
          type: "UNAUTHORIZED",
          messageKey: "inviteModal.errorUnauthorized",
          canRetry: false,
        });
      } else if (status === 403 || code === "FORBIDDEN") {
        setLoadError({
          type: "FORBIDDEN",
          messageKey: "inviteModal.errorForbidden",
          canRetry: false,
        });
      } else if (status === 404 || code === "GROUP_NOT_FOUND") {
        setLoadError({
          type: "NOT_FOUND",
          messageKey: "inviteModal.errorGroupNotFound",
          canRetry: false,
        });
      } else {
        setLoadError({
          type: "SERVER_ERROR",
          messageKey: "inviteModal.errorLoadInvites",
          canRetry: true,
        });
      }
      setPendingInvites([]);
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    let isActive = true;
    if (isOpen) {
      queueMicrotask(() => {
        if (!isActive) return;
        fetchInviteData();
        setEmailError("");
        setSuccessMessage("");
      });
    }
    return () => {
      isActive = false;
    };
  }, [isOpen, fetchInviteData]);

  // Gửi lời mời qua Email
  const sendInvite = useCallback(
    async (email, role = "member") => {
      const trimmedEmail = email?.trim();
      if (!trimmedEmail) {
        setEmailError("validation.emailRequired");
        return false;
      }
      if (!EMAIL_REGEX.test(trimmedEmail)) {
        setEmailError("validation.emailInvalid");
        return false;
      }

      setEmailError("");
      setSuccessMessage("");
      setIsSending(true);
      try {
        await groupService.sendGroupInvite(groupId, {
          email: trimmedEmail,
          role,
        });
        setSuccessMessage("inviteModal.sendSuccess");
        await fetchInviteData();
        return true;
      } catch (err) {
        console.error("Failed to send invite:", err);
        const errCode = err?.code;
        if (errCode === "ALREADY_MEMBER") {
          setEmailError("inviteModal.errorAlreadyMember");
        } else if (errCode === "GROUP_CAPACITY_FULL") {
          setEmailError("inviteModal.errorGroupFull");
        } else if (errCode === "FORBIDDEN") {
          setEmailError("inviteModal.errorForbidden");
        } else if (errCode === "INVITATION_FEATURE_NOT_CONFIGURED") {
          setEmailError("inviteModal.errorFeatureUnavailable");
        } else if (err?.status >= 500 || !err?.status) {
          setEmailError("inviteModal.errorSendFailed");
        } else {
          setEmailError(err?.message || "inviteModal.errorSendFailed");
        }
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [groupId, fetchInviteData]
  );

  // Gửi lại email lời mời (hạn 24h mới)
  const resendInvite = useCallback(
    async (inviteId) => {
      if (!inviteId) return;
      setResendingId(inviteId);
      setEmailError("");
      try {
        await groupService.resendGroupInvite(groupId, inviteId);
        await fetchInviteData();
      } catch (err) {
        console.error("Failed to resend invite:", err);
        setEmailError(err?.message || "inviteModal.errorResendFailed");
      } finally {
        setResendingId(null);
      }
    },
    [groupId, fetchInviteData]
  );

  // Thu hồi lời mời
  const revokeInvite = useCallback(
    async (inviteId) => {
      if (!inviteId) return;
      setRevokingId(inviteId);
      setEmailError("");
      try {
        await groupService.revokeGroupInvite(groupId, inviteId);
        await fetchInviteData();
      } catch (err) {
        console.error("Failed to revoke invite:", err);
        setEmailError(err?.message || "inviteModal.errorRevokeFailed");
      } finally {
        setRevokingId(null);
      }
    },
    [groupId, fetchInviteData]
  );

  return {
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
    reload: fetchInviteData,
  };
}

export default useGroupInvites;
