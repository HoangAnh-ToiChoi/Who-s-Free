import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";
import { useParams } from "react-router";
import { useSessionResolver, useCurrentUser, useUserGroupRole } from "~/hooks";
import MatrixHeader from "./components/MatrixHeader";
import AvailabilityGrid from "./components/AvailabilityGrid";
import { LeadMatrixContent } from "~/pages/LeadMatrix";
import MatrixGate from "~/components/MatrixGate";
import SaveStatusIndicator from "./components/SaveStatusIndicator";
import BodyPortal from "~/components/BodyPortal";
import { useSessionFinalizeSync } from "~/hooks";
import { useFinalizingLock } from "./hooks/useFinalizingLock";

/**
 * Trang Ma trận / Nhập thời gian rảnh của thành viên (Member Availability Input)
 * Chứa Lưới Kéo Thả thời gian cốt lõi (Core Feature) của dự án và chế độ Lead Matrix.
 */
function MatrixContent() {
  const { t } = useTranslation();
  const { currentSession, refreshCurrentSession } = useSessionResolver();
  const { currentUser } = useCurrentUser();
  const { groupId } = useParams();
  const { role } = useUserGroupRole(groupId);
  const isLead = role === "owner" || role === "lead";
  useSessionFinalizeSync(currentSession?.id, refreshCurrentSession);
  // Server từ chối lần lưu vì phiên vừa chốt → chuyển màn đã chốt ngay và nói rõ thay đổi cuối chưa được lưu
  const [lostLastEdit, setLostLastEdit] = useState(false);
  // Trưởng nhóm đang mở bảng Chốt lịch: chỉ xem, không sửa lịch
  const isFinalizingLocked = useFinalizingLock(currentSession, currentUser?.id, refreshCurrentSession);
  const handleSessionLocked = () => {
    setLostLastEdit(true);
    refreshCurrentSession();
  };

  // Lịch đã chốt: khoá kéo thả, mọi người xem như chế độ Lead (ai chọn gì, chọn như nào).
  // Chỉ trưởng nhóm (lead/owner) có thêm nút Xuất Excel và Huỷ chốt.
  if (currentSession?.status === "finalized") {
    return (
      <>
        <LeadMatrixContent readOnly={!isLead} />
        {lostLastEdit && (
          <BodyPortal>
            <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md bg-white shadow-lg rounded-xl">
              <SaveStatusIndicator status="locked" />
            </div>
          </BodyPortal>
        )}
      </>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-2 py-2 sm:px-6 sm:py-4 lg:px-8 min-h-0 flex-1 flex flex-col overflow-hidden">
      {/* Header session với link quay lại nhóm & nút chuyển đổi chế độ */}
      <MatrixHeader session={currentSession} />

      {isFinalizingLocked && (
        <div
          role="status"
          className="mb-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-800 sm:text-sm"
        >
          <Lock size={15} className="mt-0.5 shrink-0" />
          <span>{t("finalize.finalizingBanner")}</span>
        </div>
      )}

      {/* Vùng hiển thị Lưới: Thành viên (AvailabilityGrid) hoặc Lead (LeadMatrix) */}
      <div className="flex-1 min-h-0 flex flex-col">
        <AvailabilityGrid
          sessionId={currentSession?.id}
          sessionCacheKey={currentSession?.slug || currentSession?.id}
          dateWindow={{ startDate: currentSession?.startDate, endDate: currentSession?.endDate }}
          memberId={currentUser?.id}
          onSessionLocked={handleSessionLocked}
          locked={isFinalizingLocked}
        />
      </div>
    </div>
  );
}

function Matrix() {
  return (
    <MatrixGate withMyAvailability>
      <MatrixContent />
    </MatrixGate>
  );
}

export default Matrix;
