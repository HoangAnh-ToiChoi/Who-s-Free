import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { AlertCircle, CheckCircle2, ShieldCheck, RotateCcw } from "lucide-react";
import { cn } from "~/lib/utils";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { useAuth } from "~/hooks/useAuth";
import BackButton from "~/components/BackButton";
import { getSafeReturnUrl } from "~/utils/safeReturnUrl";
import OtpCodeInput, { OTP_LENGTH } from "./components/OtpCodeInput";

// Khung thông báo theo lý do tới màn này: vừa đăng ký / đăng nhập khi chưa xác thực / chưa gửi được mã
const NOTICE = {
  register: { tone: "border-emerald-200 bg-emerald-50/70 text-emerald-800", icon: CheckCircle2, key: "verifyRegistered" },
  login: { tone: "border-amber-200 bg-amber-50/70 text-amber-800", icon: AlertCircle, key: "verifyLogin" },
  failed: { tone: "border-rose-200 bg-rose-50/70 text-rose-800", icon: AlertCircle, key: "verifySendFailed" },
};

/**
 * Màn nhập mã xác thực email (sau khi đăng ký, hoặc đăng nhập khi email chưa xác thực).
 * Nhận { email, reason, sendFailed, resendInSeconds, returnUrl } qua location.state. Không cho đổi email ở đây.
 */
function VerifyEmail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { verifyEmail, resendVerificationEmail } = useAuth();

  const email = state?.email || "";
  const [notice, setNotice] = useState(state?.sendFailed ? "failed" : state?.reason === "login" ? "login" : "register");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [countdown, setCountdown] = useState(state?.resendInSeconds ?? 60);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = setTimeout(() => setCountdown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  if (!email) return <Navigate to="/auth/login" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== OTP_LENGTH) return setError(t("auth.otpInvalid"));
    setIsSubmitting(true);
    try {
      const result = await verifyEmail({ email, otp });
      if (result?.passwordResetRequired) {
        navigate("/auth/forgot-password", { replace: true, state: { email, notice: "passwordResetRequired" } });
        return;
      }
      navigate(getSafeReturnUrl(`?returnUrl=${encodeURIComponent(state?.returnUrl || "/")}`), { replace: true });
    } catch {
      setError(t("auth.verifyCodeInvalid"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setInfo(null);
    try {
      const res = await resendVerificationEmail(email);
      setNotice(state?.reason === "login" ? "login" : "register");
      setInfo(t("auth.verifyResent"));
      setOtp("");
      setCountdown(res?.resendInSeconds || 60);
    } catch (err) {
      if (err?.details?.retryAfterSeconds) setCountdown(err.details.retryAfterSeconds);
      else setNotice("failed");
    }
  };

  const { tone, icon: NoticeIcon, key } = NOTICE[notice];

  return (
    <Card className="gap-0 rounded-2xl border border-slate-200/90 bg-white p-7 shadow-sm sm:p-9">
      <div className="mb-5">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200/80 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold tracking-wider text-indigo-700">
          <ShieldCheck size={12} className="text-indigo-600" />
          <span>{t("auth.verifyBadge")}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("auth.verifyTitle")}</h1>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
          {t("auth.verifySentTo")} <strong className="font-semibold break-all text-slate-800">{email}</strong>.{" "}
          {t("auth.verifyExpires")}
        </p>
        <Link
          to="/auth/register"
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
        >
          <RotateCcw size={12} />
          <span>{t("auth.verifyWrongEmail")}</span>
        </Link>
      </div>

      <div role="status" className={cn("mb-5 flex items-start gap-2.5 rounded-xl border p-3.5 text-xs", tone)}>
        <NoticeIcon size={16} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-bold">{t(`auth.${key}Title`)}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed opacity-90">{info || t(`auth.${key}Desc`)}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
        <div>
          <OtpCodeInput
            value={otp}
            invalid={Boolean(error)}
            onChange={(next) => {
              setOtp(next);
              if (error) setError(null);
            }}
          />
          {error && (
            <div role="alert" className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-rose-600">
              <AlertCircle size={13} className="shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-0.5 text-[11px] text-slate-500">
          {countdown > 0 ? (
            <span>{t("auth.resendIn", { seconds: countdown })}</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              className="cursor-pointer font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              {t("auth.resendNow")}
            </button>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="mt-2 h-11 w-full cursor-pointer gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-xs transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50"
        >
          <ShieldCheck size={14} />
          <span>{t("auth.verifySubmit")}</span>
        </Button>
      </form>

      <div className="mt-6 flex justify-center">
        <BackButton to="/auth/login" label={t("auth.backToLogin")} />
      </div>
    </Card>
  );
}

export default VerifyEmail;
