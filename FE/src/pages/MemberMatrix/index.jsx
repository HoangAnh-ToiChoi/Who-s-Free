import { useSessionResolver, useCurrentUser } from "~/hooks";
import MatrixHeader from "./components/MatrixHeader";
import AvailabilityGrid from "./components/AvailabilityGrid";

/**
 * Trang Ma trận / Nhập thời gian rảnh của thành viên (Member Availability Input)
 * Chứa Lưới Kéo Thả thời gian cốt lõi (Core Feature) của dự án và chế độ Lead Matrix.
 */
function Matrix() {
  const { currentSession } = useSessionResolver();
  const { currentUser } = useCurrentUser();

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

export default Matrix;
