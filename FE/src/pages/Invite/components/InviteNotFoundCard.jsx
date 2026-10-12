import { Link } from "react-router";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * InviteNotFoundCard - Hiển thị khi lời mời không tồn tại hoặc liên kết bị lỗi
 */
export function InviteNotFoundCard({ error }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white rounded-3xl border border-rose-200 p-8 shadow-xs text-center space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <AlertCircle size={28} strokeWidth={2.2} />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-rose-900">
              {t("invitePage.errorTitle", { defaultValue: "Lời mời không khả dụng" })}
            </h2>
            <p className="text-xs text-rose-600 leading-relaxed">{error}</p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer group"
          >
            <ArrowLeft size={14} className="transition-colors group-hover:text-red-600" />
            <span className="transition-colors group-hover:text-red-600">
              {t("invitePage.backHome", { defaultValue: "Về trang chủ" })}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default InviteNotFoundCard;
