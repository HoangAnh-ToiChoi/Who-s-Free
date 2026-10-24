import { useParams } from "react-router";
import { useSessionResolver, useCurrentUser, useUserGroupRole } from "~/hooks";
import MatrixHeader from "./components/MatrixHeader";
import AvailabilityGrid from "./components/AvailabilityGrid";
import { LeadMatrixContent } from "~/pages/LeadMatrix";
import MatrixGate from "~/components/MatrixGate";
import { useSessionFinalizeSync } from "~/hooks";

/**
 * Trang Ma trận / Nhập thời gian rảnh của thành viên (Member Availability Input)
 * Chứa Lưới Kéo Thả thời gian cốt lõi (Core Feature) của dự án và chế độ Lead Matrix.
 */
function MatrixContent() {
  const { currentSession, refreshCurrentSession } = useSessionResolver();
  const { currentUser } = useCurrentUser();
  const { groupId } = useParams();
  const { role } = useUserGroupRole(groupId);
  const isLead = role === "owner" || role === "lead";
  useSessionFinalizeSync(currentSession?.id, refreshCurrentSession);

  // Lịch đã chốt: khoá kéo thả, mọi người xem như chế độ Lead (ai chọn gì, chọn như nào).
  // Chỉ trưởng nhóm (lead/owner) có thêm nút Xuất Excel và Huỷ chốt.
  if (currentSession?.status === "finalized") {
    return <LeadMatrixContent readOnly={!isLead} />;
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8 h-[calc(100vh-72px)] flex flex-col overflow-hidden">
      {/* Header session với link quay lại nhóm & nút chuyển đổi chế độ */}
      <MatrixHeader session={currentSession} />

      {/* Vùng hiển thị Lưới: Thành viên (AvailabilityGrid) hoặc Lead (LeadMatrix) */}
      <div className="flex-1 min-h-0 flex flex-col">
        <AvailabilityGrid
          sessionId={currentSession?.id}
          sessionCacheKey={currentSession?.slug || currentSession?.id}
          memberId={currentUser?.id}
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
