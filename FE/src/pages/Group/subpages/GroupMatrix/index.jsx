import { useTranslation } from "react-i18next";
import { Grid3X3, Clock, Sparkles } from "lucide-react";
import { Button } from "~/components/ui/button";

function GroupMatrix({ group }) {
  const { t } = useTranslation();

  return (
    <div className="mt-8 rounded-2xl border border-dashed border-indigo-200 bg-white p-12 text-center shadow-xs">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
        <Grid3X3 size={28} />
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-900">
        Ma trận rảnh/bận (Availability Heatmap)
      </h3>
      <p className="mx-auto mt-2 max-w-md text-xs text-slate-500 leading-relaxed">
        Phân hệ tính toán khung giờ trùng rảnh tự động của tất cả thành viên trong nhóm <strong>{group?.name || "này"}</strong> qua CalDAV & Google Calendar.
      </p>
      <div className="mt-6 flex items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-700">
          <Sparkles size={13} />
          <span>Sẵn sàng kết nối API Matrix</span>
        </span>
      </div>
    </div>
  );
}

export default GroupMatrix;
