import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";

/**
 * Placeholder - Trang giữ chỗ cho các tính năng đang phát triển (Overview, Settings,...)
 * Đảm bảo layout chuẩn đồng bộ với toàn hệ thống (max-w-7xl, căn giữa, responsive),
 * loại bỏ việc viết inline CSS hoặc inline JSX gây vỡ bố cục trong file Routing.
 */
function Placeholder({ pageName = "Feature" }) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xs">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-inner">
          <Sparkles size={28} />
        </div>
        <h2 className="mt-5 text-xl font-bold text-slate-900">
          {pageName} — {t("placeholder.comingSoonTitle")}
        </h2>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          {t("placeholder.comingSoonDesc", { name: pageName })}
        </p>
        <div className="mt-6">
          <Link to="/">
            <Button
              type="button"
              variant="outline"
              className="h-10 px-4 rounded-xl gap-2 font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 border-slate-200 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
            >
              <ArrowLeft size={16} />
              <span>{t("placeholder.backHome")}</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Placeholder;
