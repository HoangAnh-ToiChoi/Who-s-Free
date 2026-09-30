import { useSessionResolver, useWeekNavigation } from "~/hooks";
import LeadMatrixHeader from "./components/LeadMatrixHeader";
import HeatmapGrid from "./components/HeatmapGrid";
import MemberFilterBar from "./components/MemberFilterBar";
import OptimalAnalysis from "./components/OptimalAnalysis";
import { useHeatmapMatrix } from "./hooks/useHeatmapMatrix";
import { useMemberFilter } from "./hooks/useMemberFilter";
import GridToolbar from "~/pages/MemberMatrix/components/GridToolbar";

/**
 * LeadMatrix - Trang chế độ Trưởng nhóm
 * Hiển thị:
 * 1. Header session + link chuyển sang MemberMatrix
 * 2. MemberFilterBar: Lọc thành viên theo nhóm vai trò hoặc cá nhân
 * 3. GridToolbar: Điều hướng tuần (tái sử dụng từ MemberMatrix)
 * 4. HeatmapGrid: Lưới heatmap mật độ rảnh + CellDetailPopover
 * 5. OptimalAnalysis: Sidebar phân tích khung giờ vàng & xung đột
 */
function LeadMatrix() {
  const { currentSession } = useSessionResolver();
  const {
    weekDays,
    weekLabel,
    goToPrevWeek,
    goToNextWeek,
    goToToday,
  } = useWeekNavigation();

  const sessionId = currentSession?.id || "sess-1";

  const {
    activePreset,
    selectedMemberIds,
    allMembers,
    setPreset,
    toggleMember,
  } = useMemberFilter(sessionId);

  const { matrix, totalMembers, getCell } = useHeatmapMatrix(selectedMemberIds, sessionId);

  // Pseudo stats cho GridToolbar (reuse component nhưng hiện context khác)
  const leadStats = {
    count: totalMembers,
    totalHours: `${selectedMemberIds.length} members`,
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8 h-[calc(100vh-72px)] flex flex-col overflow-hidden">
      {/* Header session */}
      <LeadMatrixHeader session={currentSession} />

      {/* Member Filter Bar */}
      <MemberFilterBar
        activePreset={activePreset}
        allMembers={allMembers}
        selectedMemberIds={selectedMemberIds}
        onPresetChange={setPreset}
        onToggleMember={toggleMember}
      />

      {/* Grid Toolbar (tái sử dụng) — tuần navigation */}
      <div className="px-1">
        <GridToolbar
          weekLabel={weekLabel}
          stats={leadStats}
          onPrevWeek={goToPrevWeek}
          onNextWeek={goToNextWeek}
          onToday={goToToday}
          onClearAll={() => {}}
        />
      </div>

      {/* Main Content: Heatmap + Sidebar */}
      <div className="flex-1 min-h-0 flex gap-4 mt-1">
        {/* Heatmap Grid — takes most space */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <HeatmapGrid
            weekDays={weekDays}
            matrix={matrix}
            totalMembers={totalMembers}
            getCell={getCell}
          />
        </div>

        {/* Sidebar Analysis — fixed width on desktop */}
        <div className="hidden xl:flex w-80 shrink-0 overflow-y-auto">
          <OptimalAnalysis />
        </div>
      </div>
    </div>
  );
}

export default LeadMatrix;
