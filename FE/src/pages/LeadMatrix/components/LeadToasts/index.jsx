import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "lucide-react";

/** Các toast nổi của màn Lead: xuất file xong / lỗi xuất file / kết quả gửi email chốt lịch. */
function LeadToasts({ exportNotice, exportError, emailResult }) {
  const { t } = useTranslation();
  return (
    <>
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
      {emailResult && (
        <div className="absolute top-16 right-8 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 shadow-lg">
          {t("finalize.emailResult", { sent: emailResult.sent, total: emailResult.total })}
          {emailResult.failed > 0 && ` ${t("finalize.emailFailed", { count: emailResult.failed })}`}
        </div>
      )}
    </>
  );
}

export default LeadToasts;
