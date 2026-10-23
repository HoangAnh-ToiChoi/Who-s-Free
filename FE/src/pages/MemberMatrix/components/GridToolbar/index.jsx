import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Globe, Trash2, FileSpreadsheet, Lock, LockOpen } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ConfirmModal } from "~/components/Modals";

/**
 * GridToolbar - Thanh công cụ điều hướng tuần (Google Calendar Navigation)
 * Hỗ trợ 2 chế độ:
 * - "member": Hiển thị số slot đã chọn + Nút Xóa lựa chọn
 * - "lead": Hiển thị số thành viên đang lọc + Nút Xuất file
 */
function GridToolbar({
  weekLabel,
  stats,
  onPrevWeek,
  onNextWeek,
  onToday,
  onClearAll,
  mode = "member",
  onExport,
  isExporting = false,
  readOnly = false,
  isFinalized = false,
  isBusy = false,
  onFinalize,
  onUnfinalize,
}) {
  const { t } = useTranslation();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2 px-1 text-xs select-none">
      {/* Cụm điều hướng tuần: < Today > + Tiêu đề khoảng ngày */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-white border border-slate-200/90 rounded-xl p-1 shadow-2xs">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onPrevWeek}
            className="h-7 w-7 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
            aria-label={t("gridToolbar.prevWeek")}
          >
            <ChevronLeft size={16} />
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onToday}
            className="h-7 px-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            {t("gridToolbar.today")}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onNextWeek}
            className="h-7 w-7 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
            aria-label={t("gridToolbar.nextWeek")}
          >
            <ChevronRight size={16} />
          </Button>
        </div>

        <span className="text-sm font-bold text-slate-900">
          {weekLabel}
        </span>
      </div>

      {/* Cụm thống kê & Thao tác nhanh */}
      <div className="flex items-center gap-3">
        {/* Múi giờ */}
        <div className="flex items-center gap-1.5 text-slate-500">
          <Globe size={13} className="text-slate-400" />
          <span className="text-[11px] font-medium">{t("gridToolbar.timezone")}</span>
        </div>

        {/* Badge & Nút thao tác theo chế độ */}
        {mode === "lead" ? (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 text-xs font-semibold text-indigo-700">
              {stats?.label ||
                t("leadMatrix.membersCountFiltered", {
                  selected: stats?.selectedCount ?? stats?.count ?? 0,
                  total: stats?.totalMembers ?? stats?.count ?? 0,
                })}
            </span>

            {/* Nút Xuất Excel / Chốt lịch / Mở khoá: chỉ Lead (chế độ xem của thành viên bị ẩn) */}
            {!readOnly && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isExporting}
                  onClick={onExport}
                  className="h-7 px-2.5 rounded-lg text-xs font-semibold gap-1.5 text-indigo-700 border-indigo-200/90 bg-indigo-50/80 hover:bg-indigo-100 hover:text-indigo-800 hover:border-indigo-300 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                >
                  <FileSpreadsheet size={13} className="shrink-0 text-indigo-600" />
                  <span>{isExporting ? t("finalize.exporting") : t("leadMatrix.exportFile")}</span>
                </Button>

                {isFinalized ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onClick={onUnfinalize}
                    className="h-7 px-2.5 rounded-lg text-xs font-semibold gap-1.5 text-amber-700 border-amber-200 bg-amber-50/80 hover:bg-amber-100 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                  >
                    <LockOpen size={13} className="shrink-0" />
                    <span>{t("finalize.unlock")}</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={isBusy}
                    onClick={onFinalize}
                    className="h-7 px-2.5 rounded-lg text-xs font-semibold gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                  >
                    <Lock size={13} className="shrink-0" />
                    <span>{t("finalize.button")}</span>
                  </Button>
                )}
              </>
            )}
          </div>
        ) : stats.count > 0 ? (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 text-xs font-semibold text-indigo-700">
              {t("gridToolbar.slotsSelected", {
                count: stats.count,
                hours: stats.totalHours,
              })}
            </span>

            {/* Nút Clear lựa chọn cho MemberMatrix */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmOpen(true)}
              className="h-7 px-2.5 rounded-lg text-xs font-semibold gap-1.5 text-rose-600 border-rose-200 bg-rose-50/70 hover:bg-rose-100 hover:text-rose-700 hover:border-rose-300 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
            >
              <Trash2 size={13} className="shrink-0" />
              <span>{t("gridToolbar.clearSelections")}</span>
            </Button>
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">
            {t("gridToolbar.noSlotsSelected")}
          </span>
        )}
      </div>

      {/* Modal xác nhận xóa phong cách Facebook: đảo nút an toàn sang phải để tránh tay nhanh hơn não */}
      <ConfirmModal
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title={t("gridToolbar.clearConfirmTitle")}
        description={t("gridToolbar.clearConfirmDesc")}
        confirmText={t("gridToolbar.clearConfirmDelete")}
        cancelText={t("gridToolbar.clearConfirmKeep")}
        onConfirm={() => {
          onClearAll?.();
          setIsConfirmOpen(false);
        }}
      />
    </div>
  );
}

export default GridToolbar;
