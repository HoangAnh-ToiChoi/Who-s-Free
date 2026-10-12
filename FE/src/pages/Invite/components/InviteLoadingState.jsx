import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * InviteLoadingState - Giao diện trạng thái đang tải dữ liệu lời mời
 */
export function InviteLoadingState() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-8 animate-spin text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium tracking-wide">
          {t("invitePage.loading", { defaultValue: "Đang kiểm tra lời mời..." })}
        </p>
      </div>
    </div>
  );
}

export default InviteLoadingState;
