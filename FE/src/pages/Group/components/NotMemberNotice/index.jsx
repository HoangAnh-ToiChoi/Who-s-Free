import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";

/** Hiện khi BE trả 403 cho trang nhóm: người xem không phải thành viên (vd mở link nhóm được gửi qua chat). */
function NotMemberNotice() {
  const { t } = useTranslation();
  return (
    <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xs">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Lock size={22} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{t("groupDetail.notMemberTitle")}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{t("groupDetail.notMemberDesc")}</p>
      <Link
        to="/"
        className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white shadow-xs hover:bg-indigo-700"
      >
        {t("common.backToHome")}
      </Link>
    </div>
  );
}

export default NotMemberNotice;
