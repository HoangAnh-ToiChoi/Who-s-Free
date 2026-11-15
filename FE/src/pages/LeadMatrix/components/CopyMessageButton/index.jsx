import { useTranslation } from "react-i18next";
import { Check, ClipboardCopy, TriangleAlert } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useCopyFinalizeMessage } from "../../hooks/useCopyFinalizeMessage";

/** Nút "Copy tin nhắn chốt lịch": dán thẳng vào Zalo/Messenger. */
function CopyMessageButton({ title, members, link }) {
  const { t } = useTranslation();
  const { status, copy } = useCopyFinalizeMessage({ title, members, link });
  const Icon = status === "copied" ? Check : status === "failed" ? TriangleAlert : ClipboardCopy;
  const label = t(status === "copied" ? "finalize.copied" : status === "failed" ? "finalize.copyFailed" : "finalize.copyMessageButton");

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={copy}
      aria-live="polite"
      title={t("finalize.copyMessageButton")}
      className={`h-7 px-2.5 rounded-lg text-xs font-semibold gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98] ${
        status === "copied"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : status === "failed"
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : "border-indigo-200/90 bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800"
      }`}
    >
      <Icon size={13} className="shrink-0" />
      <span className={status === "idle" ? "hidden sm:inline" : undefined}>{label}</span>
    </Button>
  );
}

export default CopyMessageButton;
