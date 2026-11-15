import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { buildFinalizeMessage } from "~/utils/finalizeMessage";
import { copyText } from "~/utils/copyText";

const FEEDBACK_MS = 2500;

/**
 * useCopyFinalizeMessage - Dựng tin nhắn chốt lịch từ dữ liệu đang xem và copy vào clipboard.
 * status: idle | copied | failed (tự về idle sau ít giây).
 */
export function useCopyFinalizeMessage({ title, members, link }) {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState("idle");
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const copy = useCallback(async () => {
    const message = buildFinalizeMessage({ title, members, link, t, lang: i18n.language });
    const ok = await copyText(message, t("finalize.copyPrompt"));
    setStatus(ok ? "copied" : "failed");
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStatus("idle"), FEEDBACK_MS);
  }, [title, members, link, t, i18n.language]);

  return { status, copy };
}

export default useCopyFinalizeMessage;
