import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "~/hooks";
import { joinService } from "~/service/joinService/joinService";
import { groupService } from "~/service/groupService/groupService";

/**
 * useJoinPage - Custom Domain Hook quản lý logic tải và tham gia nhóm qua link
 *
 * Nguyên tắc UX (fe-guidelines & design doc):
 *   - Parallel fetch: Preview và auth session resolve chạy song song
 *   - Membership check: Chạy SAU khi auth resolved để tránh race condition
 */
export function useJoinPage() {
  const { t } = useTranslation();
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id;

  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isJoining, setIsJoining] = useState(false);
  const [acceptSuccess, setAcceptSuccess] = useState(false);
  const [acceptedData, setAcceptedData] = useState(null);
  const [isAlreadyMember, setIsAlreadyMember] = useState(false);

  // 1. Tải thông tin preview công khai
  const loadPreview = useCallback(async () => {
    if (!token) {
      setError(t("joinPage.invalidToken", { defaultValue: "Liên kết tham gia không hợp lệ" }));
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await joinService.getJoinPreview(token);
      setPreview(data);
    } catch (err) {
      console.error("Failed to load join preview:", err);
      setError(
        err?.message ||
          t("joinPage.notFoundMessage", {
            defaultValue: "Không tìm thấy nhóm hoặc liên kết đã bị xóa",
          })
      );
    } finally {
      setIsLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    let isActive = true;
    queueMicrotask(() => {
      if (isActive) loadPreview();
    });
    return () => {
      isActive = false;
    };
  }, [loadPreview]);

  // 2. Membership check chạy sau khi cả preview và auth đã sẵn sàng
  useEffect(() => {
    let isActive = true;
    async function checkMembership() {
      if (!userId || !preview?.group?.id) return;
      try {
        const members = await groupService.getMembers(preview.group.id);
        if (!isActive) return;
        const found = members.some((m) => m.userId === userId || m.id === userId);
        if (found) setIsAlreadyMember(true);
      } catch {
        // Bỏ qua nếu user chưa có quyền xem danh sách thành viên trước khi join
      }
    }

    if (!isAuthLoading && preview) {
      checkMembership();
    }

    return () => {
      isActive = false;
    };
  }, [userId, isAuthLoading, preview]);

  // 3. Xử lý hành động Tham gia nhóm
  const handleJoin = async () => {
    if (!token || isJoining) return;

    try {
      setIsJoining(true);
      setError(null);
      const result = await joinService.joinGroup(token);
      setAcceptedData(result);
      setAcceptSuccess(true);
    } catch (err) {
      console.error("Failed to join group:", err);
      const errCode = err?.code;
      if (errCode === "ALREADY_MEMBER") {
        setIsAlreadyMember(true);
      } else if (errCode === "INVITATION_REVOKED") {
        setError(t("invitePage.errorRevoked", {
          defaultValue: "Liên kết tham gia đã bị vô hiệu hóa.",
        }));
      } else if (errCode === "INVITATION_EXPIRED") {
        setError(t("invitePage.errorExpired", {
          defaultValue: "Liên kết tham gia đã hết hạn sau 24 giờ.",
        }));
      } else if (errCode === "GROUP_CAPACITY_FULL") {
        setError(t("invitePage.errorGroupFull", {
          defaultValue: "Nhóm đã đạt số lượng thành viên tối đa.",
        }));
      } else {
        setError(err?.message || t("joinPage.errorAcceptFailed", {
          defaultValue: "Không thể tham gia nhóm lúc này. Vui lòng thử lại sau.",
        }));
      }
    } finally {
      setIsJoining(false);
    }
  };

  const isInvalid =
    preview?.isExpired ||
    preview?.isRevoked ||
    preview?.isGroupFull ||
    isAlreadyMember;

  return {
    token,
    user,
    preview,
    isLoading: isLoading || isAuthLoading,
    error,
    isJoining,
    acceptSuccess,
    acceptedData,
    isAlreadyMember,
    isInvalid,
    handleJoin,
    navigate,
  };
}

export default useJoinPage;
