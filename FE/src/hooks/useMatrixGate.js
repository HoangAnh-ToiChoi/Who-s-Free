import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { sessionService } from "~/service/sessionService/sessionService";
import { availabilityService } from "~/service/availabilityService/availabilityService";
import { useUserGroupRole } from "~/hooks/useUserGroupRole";
import { extractIdFromSlug } from "~/utils/slugify";

/**
 * useMatrixGate - Tải xong mọi dữ liệu cần thiết của trang lịch (vai trò, session, lịch rảnh của nhóm)
 * rồi mới cho trang hiển thị, để không bị nháy giữa chừng. Dữ liệu được giữ ngắn hạn trong cache
 * nên các hook bên trong trang dùng lại được ngay.
 *
 * @returns {{ status: "loading" | "ready" | "error", retry: () => void }}
 *   Tự thử lại khi mạng có lại.
 */
export function useMatrixGate({ groupId, withMyAvailability = false }) {
  const { sessionSlug } = useParams();
  const [searchParams] = useSearchParams();
  const slug = sessionSlug || searchParams.get("session");

  const role = useUserGroupRole(groupId);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ key: null, failed: false });
  const key = `${groupId}|${slug}|${attempt}`;

  useEffect(() => {
    if (!slug) return undefined;
    let cancelled = false;
    const sessionId = extractIdFromSlug(slug) || slug;

    Promise.all([
      sessionService.getCalendarById(slug),
      availabilityService.getSessionAvailabilities(sessionId, { strict: true }),
      // Chỉ làm nóng cache: người dùng chưa có lịch riêng không được coi là lỗi
      withMyAvailability ? availabilityService.getMemberAvailability(sessionId) : null,
    ]).then(
      () => !cancelled && setResult({ key, failed: false }),
      () => !cancelled && setResult({ key, failed: true }),
    );

    return () => {
      cancelled = true;
    };
  }, [key, slug, withMyAvailability]);

  const dataReady = !slug || result.key === key;
  const failed = role.error || (slug && result.key === key && result.failed);

  let status = "loading";
  if (failed) status = "error";
  else if (!role.isLoading && dataReady) status = "ready";

  const retry = () => {
    if (role.error) role.reload();
    setAttempt((n) => n + 1);
  };

  // Mạng có lại thì tự thử lại
  const isError = status === "error";
  useEffect(() => {
    if (!isError) return undefined;
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  });

  return { status, retry };
}

export default useMatrixGate;
