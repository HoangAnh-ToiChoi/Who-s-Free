import { Outlet } from "react-router";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import AppLogo from "~/layouts/DefaultLayout/components/Topbar/components/AppLogo";

function AuthLayout() {
  const { t, i18n } = useTranslation();
  const isVietnamese = i18n.language?.startsWith("vi");

  const toggleLanguage = () => {
    i18n.changeLanguage(isVietnamese ? "en" : "vi");
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-6 py-3.5 shadow-2xs backdrop-blur-md sm:px-10">
        <AppLogo />

        <div className="flex items-center gap-3">
          {/* Quick Language Toggle — Cố định kích thước chống giật giao diện */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex h-9 min-w-[62px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 text-xs font-bold whitespace-nowrap text-slate-700 shadow-2xs transition-all select-none hover:border-slate-300 hover:bg-slate-100"
            title={t("common.switchLanguage")}
            aria-label={t("common.switchLanguage")}
          >
            <Globe size={14} className="shrink-0 text-slate-500" />
            <span className="text-[11px] font-bold tracking-wide">
              {isVietnamese ? "VI" : "EN"}
            </span>
          </button>

          {/* Nút trở về trang chủ — Chuẩn GEMINI.md: Hover Text & Icon màu ĐỎ */}
          {/* <Link
            to="/"
            className="group flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 text-xs font-medium text-slate-600 shadow-2xs transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-[0.98]"
          >
            <ArrowLeft
              size={14}
              className="text-slate-400 transition-colors group-hover:text-red-600"
            />
            <span className="font-semibold transition-colors group-hover:text-red-600">
              {t("common.backToHome")}
            </span>
          </Link> */}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
        <div className="animate-in fade-in-50 w-full max-w-[440px] duration-200">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 py-6 text-center text-xs text-slate-500">
        <p>© 2026 Who&apos;s Free. {t("auth.footerNotice")}</p>
      </footer>
    </div>
  );
}

export default AuthLayout;
