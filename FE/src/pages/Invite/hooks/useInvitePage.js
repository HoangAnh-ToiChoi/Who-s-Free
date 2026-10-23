import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "~/hooks";
import { invitationService } from "~/service/invitationService/invitationService";
import { groupService } from "~/service/groupService/groupService";

/**
 * useInvitePage - Custom Domain Hook quản lý logic tải và chấp nhận lời mời
 */
export function useInvitePage() {
  const { t } = useTranslation();
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading, logout } = useAuth();
  const userId = user?.id;
  const userEmail = user?.email;

  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptSuccess, setAcceptSuccess] = useState(false);
  const [acceptedData, setAcceptedData] = useState(null);
  const [isAlreadyMember, setIsAlreadyMember] = useState(false);

  const loadPreview = useCallback(async () => {
    if (!token) {
      setError(t("invitePage.invalidToken", { defaultValue: "Liên kết lời mời không hợp lệ" }));
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await invitationService.getInvitationPreview(token);
      setPreview(data);

      if (userId && data?.group?.id) {
        try {
          const members = await groupService.getMembers(data.group.id);
          const found = members.some(
            (m) =>
              m.userId === userId ||
              m.id === userId ||
              (m.email && m.email.toLowerCase() === userEmail?.toLowerCase())
          );
          if (found) setIsAlreadyMember(true);
        } catch {
          // Bỏ qua lỗi check member nếu user chưa có quyền xem danh sách
        }
      }
    } catch (err) {
      console.error("Failed to load invitation preview:", err);
      setError(
        err?.message ||
          t("invitePage.notFoundMessage", {
            defaultValue: "Không tìm thấy lời mời hoặc liên kết đã bị xóa",
          })
      );
    } finally {
      setIsLoading(false);
    }
  }, [token, userId, userEmail, t]);

  useEffect(() => {
    let isActive = true;
    queueMicrotask(() => {
      if (isActive) loadPreview();
    });
    return () => {
      isActive = false;
    };
  }, [loadPreview]);

  const handleAccept = async () => {
    if (!token || isAccepting) return;

    try {
      setIsAccepting(true);
      setError(null);
      const result = await invitationService.acceptInvitation(token);
      setAcceptedData(result);
      setAcceptSuccess(true);
    } catch (err) {
      console.error("Failed to accept invitation:", err);
      const errCode = err?.code;
      if (errCode === "EMAIL_MISMATCH") {
        setError(t("invitePage.errorMismatchDetail", {
          defaultValue: "Email tài khoản hiện tại không khớp với email được mời.",
        }));
      } else if (errCode === "INVITATION_EXPIRED") {
        setError(t("invitePage.errorExpired", {
          defaultValue: "Lời mời đã hết hạn sau 24 giờ. Vui lòng yêu cầu lời mời mới.",
        }));
      } else if (errCode === "INVITATION_REVOKED") {
        setError(t("invitePage.errorRevoked", {
          defaultValue: "Lời mời đã bị thu hồi bởi quản trị viên nhóm.",
        }));
      } else if (errCode === "ALREADY_MEMBER") {
        setIsAlreadyMember(true);
      } else if (errCode === "GROUP_CAPACITY_FULL") {
        setError(t("invitePage.errorGroupFull", {
          defaultValue: "Nhóm đã đạt số lượng thành viên tối đa.",
        }));
      } else {
        setError(err?.message || t("invitePage.errorAcceptFailed", {
          defaultValue: "Không thể chấp nhận lời mời lúc này. Vui lòng thử lại sau.",
        }));
      }
    } finally {
      setIsAccepting(false);
    }
  };

  const handleLogoutAndSwitch = async () => {
    await logout();
    const emailParam = preview?.email ? `email=${encodeURIComponent(preview.email)}&` : "";
    navigate(`/auth/login?${emailParam}returnUrl=${encodeURIComponent(`/invite/${token}`)}`, {
      replace: true,
    });
  };

  const currentEmail = user?.email?.toLowerCase();
  const invitedEmail = preview?.email?.toLowerCase();
  const isEmailMatching = Boolean(user && currentEmail && invitedEmail && currentEmail === invitedEmail);
  const isEmailMismatch = Boolean(user && currentEmail && invitedEmail && currentEmail !== invitedEmail);
  const isInvalid =
    preview?.isExpired ||
    preview?.isRevoked ||
    preview?.isAccepted ||
    preview?.isGroupFull ||
    isAlreadyMember;

  // Đăng nhập đúng email được mời xong thì tự chấp nhận lời mời (chỉ thử một lần)
  const hasAutoAccepted = useRef(false);
  const canAutoAccept = isEmailMatching && !isInvalid && !acceptSuccess && !isLoading && !isAuthLoading;
  useEffect(() => {
    if (!canAutoAccept || hasAutoAccepted.current) return;
    hasAutoAccepted.current = true;
    handleAccept();
    // handleAccept đọc state mới nhất; chỉ cần chạy khi đủ điều kiện
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAutoAccept]);

  return {
    token,
    user,
    preview,
    isLoading: isLoading || isAuthLoading,
    error,
    isAccepting,
    acceptSuccess,
    acceptedData,
    isAlreadyMember,
    isInvalid,
    isEmailMatching,
    isEmailMismatch,
    handleAccept,
    handleLogoutAndSwitch,
    navigate,
  };
}

export default useInvitePage;
