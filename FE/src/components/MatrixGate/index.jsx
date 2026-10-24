import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { AlertCircle, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "~/components/ui/button";
import SlideIn from "~/components/SlideIn";
import { useMatrixGate } from "~/hooks/useMatrixGate";

const FRAME_CLASS = "mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8 h-[calc(100vh-72px)]";

function MatrixSkeleton() {
  return (
    <div className={`${FRAME_CLASS} flex animate-pulse flex-col gap-4`} role="status" aria-busy="true">
      <div className="h-8 w-64 rounded-lg bg-slate-200" />
      <div className="h-10 w-96 max-w-full rounded-xl bg-slate-100" />
      <div className="flex min-h-0 flex-1 gap-4">
        <div className="flex-1 rounded-2xl border border-slate-200 bg-white" />
        <div className="hidden w-80 shrink-0 rounded-2xl border border-slate-200 bg-white xl:block" />
      </div>
    </div>
  );
}

function MatrixLoadError({ onRetry }) {
  const { t } = useTranslation();
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  const Icon = offline ? WifiOff : AlertCircle;

  return (
    <div className={`${FRAME_CLASS} flex items-center justify-center`}>
      <SlideIn
        direction="up"
        className="flex max-w-md flex-col items-center rounded-2xl border border-rose-200 bg-rose-50/50 p-8 text-center shadow-xs"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <Icon size={24} />
        </div>
        <h3 className="mt-4 text-base font-semibold text-rose-900">
          {offline ? t("matrixGate.offlineTitle") : t("matrixGate.errorTitle")}
        </h3>
        <p className="mt-1 text-sm text-rose-600">
          {offline ? t("matrixGate.offlineDesc") : t("matrixGate.errorDesc")}
        </p>
        <Button
          variant="outline"
          onClick={onRetry}
          className="mt-4 h-9 min-w-[100px] cursor-pointer justify-center gap-2 border-rose-300 text-rose-700 hover:bg-rose-100"
        >
          <RefreshCw size={14} />
          <span>{t("common.tryAgain")}</span>
        </Button>
      </SlideIn>
    </div>
  );
}

/**
 * MatrixGate - Chỉ hiện trang lịch sau khi dữ liệu đã tải xong (có khung chờ, báo lỗi + thử lại khi mất mạng),
 * rồi trượt từ dưới lên cho mượt.
 */
function MatrixGate({ withMyAvailability = false, children }) {
  const { groupId } = useParams();
  const { status, retry } = useMatrixGate({ groupId, withMyAvailability });

  if (status === "loading") return <MatrixSkeleton />;
  if (status === "error") return <MatrixLoadError onRetry={retry} />;

  return <SlideIn direction="up">{children}</SlideIn>;
}

export default MatrixGate;
