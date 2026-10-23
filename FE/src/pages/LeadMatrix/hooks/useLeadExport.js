import { useState, useCallback } from "react";

/**
 * useLeadExport - Custom hook xử lý xuất báo cáo lịch trình tổng hợp ra file bảng tính (CSV/Excel)
 * Hỗ trợ chuẩn hóa ký tự tiếng Việt với UTF-8 BOM và tự động quản lý trạng thái thông báo.
 */
export function useLeadExport() {
  const [exportNotice, setExportNotice] = useState(false);

  const exportToCsv = useCallback(
    ({
      sessionTitle = "LeadMatrix",
      weekLabel = "",
      totalMembers = 0,
      allMembers = [],
      weekDays = [],
      matrix = {},
    }) => {
      const rows = [
        ["WHO'S FREE - BẢNG TỔNG HỢP LỊCH RẢNH NHÓM"],
        ["Phiên khảo sát:", sessionTitle],
        ["Tuần khảo sát:", weekLabel],
        ["Tổng số thành viên:", totalMembers],
        ["Thành viên đã chọn lọc:", allMembers.map((m) => m.memberName || m.name).join("; ")],
        [],
        ["Thứ / Ngày", "Khung giờ", "Số người rảnh", "Tỷ lệ Quorum (%)", "Danh sách thành viên rảnh"],
      ];

      weekDays.forEach((day) => {
        const dayData = matrix[day.dayIndex] || {};
        Object.keys(dayData)
          .map(Number)
          .sort((a, b) => a - b)
          .forEach((b) => {
            const cell = dayData[b];
            if (cell && cell.count > 0) {
              const h = Math.floor(b / 60);
              const m = b % 60;
              const hEnd = Math.floor((b + 30) / 60);
              const mEnd = (b + 30) % 60;
              const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} - ${String(hEnd).padStart(2, "0")}:${String(mEnd).padStart(2, "0")}`;
              const mems = (cell.members || []).map((mem) => mem.name).join("; ");
              rows.push([
                day.dayName,
                timeStr,
                `${cell.count}/${totalMembers}`,
                `${cell.percent}%`,
                `"${mems}"`,
              ]);
            }
          });
      });

      const csvContent = "\uFEFF" + rows.map((r) => r.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Lich_Ranh_${sessionTitle.replace(/\s+/g, "_")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportNotice(true);
      setTimeout(() => setExportNotice(false), 4500);
    },
    []
  );

  return {
    exportNotice,
    exportToCsv,
  };
}

export default useLeadExport;
