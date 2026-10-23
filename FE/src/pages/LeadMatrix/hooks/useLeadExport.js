import { useState, useCallback } from "react";
import { sessionService } from "~/service/sessionService/sessionService";
import { downloadBlob } from "~/utils/downloadBlob";

/**
 * useLeadExport - Tải file Excel (.xlsx) lịch của session do Backend dựng sẵn.
 */
export function useLeadExport() {
  const [exportNotice, setExportNotice] = useState(false);
  const [exportError, setExportError] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const exportToXlsx = useCallback(async (sessionId, fallbackName = "lich") => {
    if (!sessionId || isExporting) return;
    setIsExporting(true);
    setExportError("");
    try {
      const { blob, fileName } = await sessionService.exportScheduleXlsx(sessionId);
      downloadBlob(blob, fileName || `${fallbackName}.xlsx`);

      setExportNotice(true);
      setTimeout(() => setExportNotice(false), 4500);
    } catch (err) {
      setExportError(err?.message || "Export failed");
      setTimeout(() => setExportError(""), 6000);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting]);

  return { exportNotice, exportError, isExporting, exportToXlsx };
}

export default useLeadExport;
