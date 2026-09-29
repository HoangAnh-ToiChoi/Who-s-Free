import { useState, useEffect, useCallback, useRef } from "react";
import copy from "copy-to-clipboard";
import { groupService } from "~/service/groupService/groupService";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Custom Hook quản lý toàn bộ vòng đời, trạng thái và tác vụ mời thành viên nhóm.
 * Đóng gói sạch sẽ logic gọi API, kiểm tra email và clipboard.
 * 
 * @param {string} groupId - ID của nhóm
 * @param {boolean} isOpen - Trạng thái hiển thị modal
 */
export function useGroupInvites(groupId, isOpen = false) {
  const [inviteCode, setInviteCode] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [pendingInvites, setPendingInvites] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [emailError, setEmailError] = useState("");

  const copyTimerRef = useRef(null);

  // Chỉ fetch dữ liệu khi modal được kích hoạt mở
  const fetchInviteData = useCallback(async () => {
    if (!groupId) return;
    setIsLoading(true);
    try {
      const data = await groupService.getGroupInviteInfo(groupId);
      setInviteCode(data.inviteCode);
      setInviteLink(data.inviteLink);
      setPendingInvites(data.pendingInvites || []);
    } catch (err) {
      console.error("Failed to load group invite info:", err);
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (isOpen) {
      fetchInviteData();
      setEmailError("");
      setCopied(false);
    }
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, [isOpen, fetchInviteData]);

  // Sao chép link vào Clipboard kèm timeout tự tắt thông báo
  const copyLink = useCallback(() => {
    if (!inviteLink) return;
    copy(inviteLink);
    setCopied(true);

    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = setTimeout(() => {
      setCopied(false);
    }, 2000);
  }, [inviteLink]);

  // Gửi lời mời qua Email
  const sendInvite = useCallback(
    async (email, role = "Member") => {
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
      setIsSending(true);
      try {
        const newInvite = await groupService.sendGroupInvite(groupId, {
          email: trimmedEmail,
          role,
        });
        setPendingInvites((prev) => [newInvite, ...prev]);
        return true;
      } catch (err) {
        console.error("Failed to send invite:", err);
        setEmailError("validation.sendFailed");
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [groupId]
  );

  // Gửi lại email lời mời
  const resendInvite = useCallback(
    async (inviteId) => {
      if (!inviteId) return;
      setResendingId(inviteId);
      try {
        await groupService.resendGroupInvite(groupId, inviteId);
      } catch (err) {
        console.error("Failed to resend invite:", err);
      } finally {
        setTimeout(() => {
          setResendingId(null);
        }, 600);
      }
    },
    [groupId]
  );

  return {
    inviteCode,
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
    reload: fetchInviteData,
  };
}

export default useGroupInvites;
