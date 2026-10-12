import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Card } from "~/components/ui/card";
import { useAuth } from "~/hooks/useAuth";
import { getSafeReturnUrl } from "~/utils/safeReturnUrl";

/**
 * AuthCallback - Trang tiếp nhận OAuth Callback từ Google / Supabase
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Phân tích mã token từ Hash Fragment (#access_token=...) hoặc Query Params (?code=...)
 *   - Gọi API đồng bộ session với Backend
 *   - Chuyển hướng người dùng vào thẳng Trang Chủ (Frame 0 mượt mà)
 */
function AuthCallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { handleGoogleSession } = useAuth();
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let isCancelled = false;

    async function processOAuthCallback() {
      try {
        const returnUrl = getSafeReturnUrl(window.location.search);

        // 1. Kiểm tra Hash Fragment (#access_token=...&refresh_token=...)
        const rawHash = window.location.hash ? window.location.hash.substring(1) : "";
        const hashParams = new URLSearchParams(rawHash);
        const hashAccessToken = hashParams.get("access_token");
        const hashRefreshToken = hashParams.get("refresh_token");

        // 2. Kiểm tra Search Params (?code=...)
        const searchParams = new URLSearchParams(window.location.search);
        const queryCode = searchParams.get("code");
        const queryError = searchParams.get("error_description") || searchParams.get("error");

        if (queryError) {
          throw new Error(queryError);
        }

        if (hashAccessToken) {
          // Lưu session và cập nhật user
          await handleGoogleSession({
            accessToken: hashAccessToken,
            refreshToken: hashRefreshToken,
          });

          if (!isCancelled) {
            navigate(returnUrl, { replace: true });
          }
          return;
        }

        if (queryCode) {
          // Let the backend exchange Authorization Codes when this flow is configured.
          window.location.assign(`/api/auth/google/callback?code=${encodeURIComponent(queryCode)}`);
          return;
        }

        // Không tìm thấy token
        throw new Error(t("auth.oauthFailed"));
      } catch (err) {
        if (!isCancelled) {
          console.error("OAuth callback error:", err);
          setErrorMessage(err.message || t("auth.oauthFailed"));
          setTimeout(() => {
            navigate("/auth/login", {
              replace: true,
              state: { formError: err.message || t("auth.oauthFailed") },
            });
          }, 1500);
        }
      }
    }

    processOAuthCallback();

    return () => {
      isCancelled = true;
    };
  }, [handleGoogleSession, navigate, t]);

  return (
    <Card className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white p-10 shadow-sm text-center">
      {!errorMessage ? (
        <>
          <div className="mb-4 size-10 animate-spin rounded-full border-3 border-indigo-100 border-t-indigo-600" />
          <h2 className="text-sm font-bold text-slate-800">
            {t("auth.oauthAuthenticating")}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {t("auth.footerNotice")}
          </p>
        </>
      ) : (
        <>
          <div className="mb-4 size-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 font-bold">
            !
          </div>
          <h2 className="text-sm font-bold text-rose-700">{errorMessage}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {t("auth.backToLogin")}...
          </p>
        </>
      )}
    </Card>
  );
}

export default AuthCallback;
