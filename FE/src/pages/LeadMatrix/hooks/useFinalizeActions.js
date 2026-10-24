import { useState, useCallback } from "react";
import { availabilityService } from "~/service/availabilityService/availabilityService";
import { sessionService } from "~/service/sessionService/sessionService";
import { buildSelectedCells } from "~/utils/finalizeCandidates";

/**
 * useFinalizeActions - Chốt lịch / mở khoá lịch của Lead
 * - Khi mở modal: nạp mọi giờ nhóm đã chọn (không giới hạn theo tuần) để Lead chọn khung giờ chốt
 * - Sau khi chốt / mở khoá: gọi onChanged(session) để màn hình cập nhật trạng thái
 */
export function useFinalizeActions({ sessionId, onChanged }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cells, setCells] = useState([]);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [emailResult, setEmailResult] = useState(null);

  const openModal = useCallback(async () => {
    if (!sessionId) return;
    setError("");
    setIsModalOpen(true);
    setIsLoadingRuns(true);
    try {
      const members = await availabilityService.getSessionAvailabilities(sessionId, { fresh: true });
      setCells(buildSelectedCells(members));
    } finally {
      setIsLoadingRuns(false);
    }
  }, [sessionId]);

  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const finalize = useCallback(
    async ({ date, startMinutes, endMinutes, note }) => {
      setIsSubmitting(true);
      setError("");
      try {
        const result = await sessionService.finalizeSession(sessionId, { date, startMinutes, endMinutes, note });
        setIsModalOpen(false);
        setEmailResult(result?.email || null);
        setTimeout(() => setEmailResult(null), 8000);
        onChanged?.(result?.session);
      } catch (err) {
        setError(err?.message || "Finalize failed");
      } finally {
        setIsSubmitting(false);
      }
    },
    [sessionId, onChanged],
  );

  const unfinalize = useCallback(async () => {
    setIsSubmitting(true);
    setError("");
    try {
      const session = await sessionService.unfinalizeSession(sessionId);
      onChanged?.(session);
    } catch (err) {
      setError(err?.message || "Unlock failed");
    } finally {
      setIsSubmitting(false);
    }
  }, [sessionId, onChanged]);

  return {
    isModalOpen,
    cells,
    isLoadingRuns,
    isSubmitting,
    error,
    emailResult,
    openModal,
    closeModal,
    finalize,
    unfinalize,
  };
}

export default useFinalizeActions;
