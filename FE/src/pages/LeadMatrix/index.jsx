import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, LockOpen } from "lucide-react";
import { useSessionResolver, useWeekNavigation, useSessionFinalizeSync } from "~/hooks";
import LeadMatrixHeader from "./components/LeadMatrixHeader";
import HeatmapGrid from "./components/HeatmapGrid";
import MemberFilterBar from "./components/MemberFilterBar";
import OptimalAnalysis from "./components/OptimalAnalysis";
import { useHeatmapMatrix } from "./hooks/useHeatmapMatrix";
import { useMemberFilter } from "./hooks/useMemberFilter";
import { useLeadExport } from "./hooks/useLeadExport";
import { useFinalizeActions } from "./hooks/useFinalizeActions";
import FinalizeModal from "./components/FinalizeModal";
import ConfirmModal from "~/components/Modals/ConfirmModal";
import GridToolbar from "~/pages/MemberMatrix/components/GridToolbar";

/**
 * LeadMatrix - Controller cho màn hình Chế độ Trưởng nhóm
 * Tuân thủ chuẩn Single Responsibility Principle (SRP):
 * - Phân rã logic tính toán ra các custom hook chuyên biệt (bắt đầu bằng "use"):
 *   + useSessionResolver: Định danh phiên khảo sát
 *   + useWeekNavigation: Điều hướng tuần
 *   + useMemberFilter: Lọc thành viên
 *   + useHeatmapMatrix: Dữ liệu lưới heatmap
 *   + useOptimalAnalysis: Bảng xếp hạng khung giờ vàng & vùng xung đột
 *   + useLeadExport: Xử lý xuất file báo cáo
 * - LeadMatrix đóng vai trò Orchestrator kết nối và điều phối trạng thái hiển thị
 *
 * readOnly: chế độ xem của thành viên khi lịch đã chốt (giống góc nhìn Lead nhưng không có nút thao tác).
 */
function LeadMatrix({ readOnly = false }) {
  const { t } = useTranslation();
  const { currentSession, updateCurrentSession, refreshCurrentSession } = useSessionResolver();
  const {
    weekDays,
    weekLabel,
    goToPrevWeek,
    goToNextWeek,
    goToToday,
  } = useWeekNavigation();

  const sessionId = currentSession?.id;

  const {
    activePreset,
    selectedMemberIds,
    allMembers,
    setPreset,
    toggleMember,
  } = useMemberFilter(sessionId);

  const { matrix, totalMembers, getCell } = useHeatmapMatrix(
    selectedMemberIds,
    sessionId,
    weekDays
  );

  const { exportNotice, exportError, isExporting, exportToXlsx } = useLeadExport();
  const finalizeActions = useFinalizeActions({
    sessionId,
    onChanged: updateCurrentSession,
  });
  useSessionFinalizeSync(sessionId, refreshCurrentSession);

  const [isUnlockConfirmOpen, setIsUnlockConfirmOpen] = useState(false);

  const finalized = currentSession?.status === "finalized" ? currentSession.finalized : null;

  // State đồng bộ tương tác khi click vào ô trong bảng xếp hạng hoặc trên lưới
  const [selectedCell, setSelectedCell] = useState(null);

  const handleSelectSlot = useCallback(
    (dayIndex, blockStart, dayName) => {
      const cell = getCell(dayIndex, blockStart);
      setSelectedCell({
        dayIndex,
        blockStart,
        dayName,
        ...cell,
        totalMembers,
      });
    },
    [getCell, totalMembers]
  );

  const handleExport = useCallback(() => {
    exportToXlsx(sessionId, currentSession?.slug || "lich");
  }, [exportToXlsx, sessionId, currentSession?.slug]);

  const leadStats = {
    selectedCount: selectedMemberIds.length,
    totalMembers,
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8 h-[calc(100vh-72px)] flex flex-col overflow-hidden relative">
      {/* Toast thông báo xuất file */}
      {exportNotice && (
        <div className="absolute top-4 right-8 z-50 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{t("finalize.exportDone")}</span>
        </div>
      )}
      {exportError && (
        <div role="alert" className="absolute top-4 right-8 z-50 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 shadow-lg">
          {exportError}
        </div>
      )}
      {finalizeActions.emailResult && (
        <div className="absolute top-16 right-8 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 shadow-lg">
          {t("finalize.emailResult", {
            sent: finalizeActions.emailResult.sent,
            total: finalizeActions.emailResult.total,
          })}
          {finalizeActions.emailResult.failed > 0 &&
            ` ${t("finalize.emailFailed", { count: finalizeActions.emailResult.failed })}`}
        </div>
      )}

      {/* Header session */}
      <LeadMatrixHeader
        session={currentSession}
        hideSwitch={readOnly || Boolean(finalized)}
        finalized={finalized}
        readOnly={readOnly}
      />

      {finalizeActions.error && !finalizeActions.isModalOpen && (
        <p role="alert" className="mb-2 text-xs font-semibold text-rose-600">{finalizeActions.error}</p>
      )}

      {/* Member Filter Bar */}
      <MemberFilterBar
        activePreset={activePreset}
        allMembers={allMembers}
        selectedMemberIds={selectedMemberIds}
        onPresetChange={setPreset}
        onToggleMember={toggleMember}
      />

      {/* Grid Toolbar — chế độ Lead: nút Xuất file */}
      <div className="px-1">
        <GridToolbar
          mode="lead"
          weekLabel={weekLabel}
          stats={leadStats}
          onPrevWeek={goToPrevWeek}
          onNextWeek={goToNextWeek}
          onToday={goToToday}
          onExport={handleExport}
          isExporting={isExporting}
          readOnly={readOnly}
          isFinalized={Boolean(finalized)}
          isBusy={finalizeActions.isSubmitting}
          onFinalize={finalizeActions.openModal}
          onUnfinalize={() => setIsUnlockConfirmOpen(true)}
        />
      </div>

      {/* Main Content: Heatmap + Sidebar Analysis */}
      <div className="flex-1 min-h-0 flex gap-4 mt-1">
        {/* Heatmap Grid */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <HeatmapGrid
            weekDays={weekDays}
            matrix={matrix}
            totalMembers={totalMembers}
            getCell={getCell}
            selectedCell={selectedCell}
            onSelectCell={setSelectedCell}
          />
        </div>

        {/* Sidebar Analysis */}
        <div className="hidden xl:flex w-80 shrink-0 overflow-y-auto">
          <OptimalAnalysis
            matrix={matrix}
            weekDays={weekDays}
            totalMembers={totalMembers}
            allMembers={allMembers}
            onSelectSlot={handleSelectSlot}
          />
        </div>
      </div>

      <ConfirmModal
        open={isUnlockConfirmOpen}
        onOpenChange={setIsUnlockConfirmOpen}
        title={t("finalize.unlockTitle")}
        description={t("finalize.unlockDescription")}
        confirmText={t("finalize.unlock")}
        cancelText={t("finalize.unlockKeep")}
        confirmIcon={LockOpen}
        isLoading={finalizeActions.isSubmitting}
        onConfirm={async () => {
          await finalizeActions.unfinalize();
          setIsUnlockConfirmOpen(false);
        }}
      />

      <FinalizeModal
        open={finalizeActions.isModalOpen}
        onOpenChange={(open) => (open ? finalizeActions.openModal() : finalizeActions.closeModal())}
        cells={finalizeActions.cells}
        isLoading={finalizeActions.isLoadingRuns}
        isSubmitting={finalizeActions.isSubmitting}
        error={finalizeActions.error}
        onSubmit={finalizeActions.finalize}
      />
    </div>
  );
}

export default LeadMatrix;
