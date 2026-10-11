import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Mail,
  KeyRound,
  Send,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { validateEmail } from "~/utils";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useAuth } from "~/hooks/useAuth";

function ForgotPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { forgotPassword, verifyOtp } = useAuth();

  // Luồng 2 bước: EMAIL -> OTP
  const [step, setStep] = useState("EMAIL"); // "EMAIL" | "OTP"
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [emailError, setEmailError] = useState(null);
  const [otpError, setOtpError] = useState(null);
  const [countdown, setCountdown] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const otpInputsRef = useRef([]);

  // Countdown timer cho việc gửi lại OTP
  useEffect(() => {
    let timer;
    if (step === "OTP" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Tự động focus vào ô đầu tiên khi chuyển sang bước OTP
  useEffect(() => {
    if (step === "OTP") {
      const focusTimer = setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);

      return () => clearTimeout(focusTimer);
    }
  }, [step]);

  // Gửi mã OTP 6 số
  const sendOtpCode = async (targetEmail) => {
    setIsSubmitting(true);
    try {
      const code = await forgotPassword(targetEmail);
      if (code) {
        setGeneratedOtp(code);
      }
      setStep("OTP");
      setCountdown(60);
      setOtp(["", "", "", "", "", ""]);
      setOtpError(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    const err = validateEmail(email, t);
    if (err) {
      setEmailError(err);
      return;
    }
    setEmailError(null);
    sendOtpCode(email.trim()).catch((error) => {
      const messageKey =
        error.message === "ACCOUNT_NOT_FOUND"
          ? "auth.errors.accountNotFound"
          : "auth.errors.storageUnavailable";
      setEmailError(t(messageKey));
    });
  };

  // Xử lý thay đổi từng ô ký tự OTP
  const handleOtpChange = (index, value) => {
    // Chỉ chấp nhận ký tự số
    const cleanValue = value.replace(/\D/g, "");

    // Hỗ trợ trường hợp paste trực tiếp vào ô bất kỳ
    if (cleanValue.length > 1) {
      const digits = cleanValue.slice(0, 6).split("");
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setOtp(newOtp);
      if (otpError) setOtpError(null);
      const nextIndex = Math.min(digits.length, 5);
      otpInputsRef.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleanValue;
    setOtp(newOtp);
    if (otpError) setOtpError(null);

    // Tự động chuyển focus sang ô tiếp theo
    if (cleanValue && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  // Xử lý xóa Backspace lùi ô
  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // Hỗ trợ Clipboard Paste
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pastedData) return;

    const digits = pastedData.slice(0, 6).split("");
    const newOtp = [...otp];
    digits.forEach((d, i) => {
      if (i < 6) newOtp[i] = d;
    });
    setOtp(newOtp);
    if (otpError) setOtpError(null);
    const focusIndex = Math.min(digits.length - 1, 5);
    otpInputsRef.current[focusIndex]?.focus();
  };

  // Xác thực mã OTP và chuyển sang đổi mật khẩu
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const enteredOtp = otp.join("");
    if (enteredOtp.length !== 6) {
      setOtpError(t("auth.otpInvalid"));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await verifyOtp(email.trim(), enteredOtp);
      const resetToken =
        typeof result === "string" ? result : result?.resetToken || "valid-reset-token";

      navigate("/auth/reset-password", {
        state: {
          email: email.trim(),
          otpVerified: true,
          resetToken,
        },
      });
    } catch {
      setOtpError(t("auth.otpInvalid"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = () => {
    if (countdown > 0) return;
    sendOtpCode(email.trim()).catch((error) => {
      const messageKey =
        error.message === "ACCOUNT_NOT_FOUND"
          ? "auth.errors.accountNotFound"
          : "auth.errors.storageUnavailable";
      setOtpError(t(messageKey));
    });
  };

  return (
    <Card className="rounded-2xl border border-slate-200/90 bg-white p-7 sm:p-9 shadow-sm gap-0">
      {step === "EMAIL" ? (
        <>
          {/* Header Step 1: Nhập Email */}
          <div className="mb-6">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200/80 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold tracking-wider text-indigo-700">
              <KeyRound size={12} className="text-indigo-600" />
              <span>{t("auth.badgeStep2")}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {t("auth.forgotTitle")}
            </h1>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              {t("auth.forgotSubtitle")}
            </p>
          </div>

          {/* Form Email — Chống trình duyệt tự lưu autofill */}
          <form
            onSubmit={handleEmailSubmit}
            autoComplete="off"
            className="space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                {t("auth.email")}
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10"
                />
                <Input
                  type="email"
                  value={email}
                  autoComplete="off"
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  placeholder={t("auth.emailPlaceholder")}
                  aria-invalid={!!emailError}
                  className={`h-11 w-full rounded-xl bg-slate-50/50 pl-10 pr-3.5 text-xs text-slate-800 placeholder:text-slate-500 transition-all focus:bg-white ${
                    emailError
                      ? "border-rose-500 bg-rose-50/40 ring-1 ring-rose-500/50 text-rose-900"
                      : "border-slate-200/90 focus:border-indigo-500 focus:ring-indigo-500/20"
                  }`}
                />
              </div>
              {emailError && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-rose-600">
                  <AlertCircle size={13} className="text-rose-500 shrink-0" />
                  <span>{emailError}</span>
                </div>
              )}
            </div>

            {/* Nút gửi mã OTP — Tái sử dụng Button component */}
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="mt-2 h-11 w-full gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-xs transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <Send size={14} />
              <span>{t("auth.submitForgot")}</span>
            </Button>
          </form>
        </>
      ) : (
        <>
          {/* Header Step 2: Nhập OTP 6 số */}
          <div className="mb-5">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200/80 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold tracking-wider text-indigo-700">
              <ShieldCheck size={12} className="text-indigo-600" />
              <span>{t("auth.badgeStepOtp")}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {t("auth.otpTitle")}
            </h1>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              {t("auth.otpSubtitle", { email })}
            </p>
            <button
              type="button"
              onClick={() => {
                setStep("EMAIL");
                setOtp(["", "", "", "", "", ""]);
                setOtpError(null);
              }}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>{t("auth.changeEmail")}</span>
            </button>
          </div>

          {/* Banner thông báo đã gửi OTP kèm mã demo hỗ trợ kiểm thử */}
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs">
            <div className="flex items-start gap-2.5">
              <CheckCircle2
                size={16}
                className="text-emerald-600 shrink-0 mt-0.5"
              />
              <div className="flex-1">
                <p className="font-bold text-emerald-800">
                  {t("auth.resetLinkDispatched")}
                </p>
                <p className="mt-0.5 text-emerald-700 leading-relaxed text-[11px]">
                  {t("auth.resetLinkDesc")}
                </p>
                {import.meta.env.DEV && generatedOtp && (
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-emerald-300/80 bg-white/80 px-2.5 py-1 text-[11px]">
                    <span className="font-medium text-emerald-800">
                      {t("auth.devOtpLabel")} {" "}
                      <strong className="font-mono text-xs">{generatedOtp}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const digits = generatedOtp.split("");
                        setOtp(digits);
                        setOtpError(null);
                        otpInputsRef.current[5]?.focus();
                      }}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                    >
                      {t("auth.devAutoFill")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form 6 ô số OTP — Chống lưu credential trình duyệt */}
          <form
            onSubmit={handleOtpSubmit}
            autoComplete="off"
            className="space-y-4"
          >
            <div>
              <div
                className="flex items-center justify-between gap-1.5 sm:gap-2.5"
                onPaste={handlePaste}
              >
                {otp.map((digit, idx) => (
                  <Input
                    key={idx}
                    ref={(el) => (otpInputsRef.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    autoComplete="off"
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    aria-label={`OTP Digit ${idx + 1}`}
                    className={`h-12 w-11 sm:w-12 text-center text-lg font-bold rounded-xl bg-slate-50/50 p-0 transition-all focus:bg-white ${
                      otpError
                        ? "border-rose-500 bg-rose-50/40 ring-1 ring-rose-500/50 text-rose-900"
                        : "border-slate-200/90 focus:border-indigo-500 focus:ring-indigo-500/20 text-slate-800"
                    }`}
                  />
                ))}
              </div>
              {otpError && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-rose-600">
                  <AlertCircle size={13} className="text-rose-500 shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}
            </div>

            {/* Countdown gửi lại mã */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>
                {countdown > 0
                  ? t("auth.resendIn", { seconds: countdown })
                  : t("auth.resendNow")}
              </span>
              {countdown === 0 && (
                <button
                  type="button"
                  onClick={handleResend}
                  className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                >
                  {t("auth.resendNow")}
                </button>
              )}
            </div>

            {/* Nút xác nhận mã OTP — Tái sử dụng Button component */}
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="mt-2 h-11 w-full gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-xs transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck size={14} />
              <span>{t("auth.submitVerifyOtp")}</span>
            </Button>
          </form>
        </>
      )}

      {/* Back to Login Button — Chuẩn GEMINI.md: Hover Text & Icon màu ĐỎ */}
      <div className="mt-6 flex justify-center">
        <Link
          to="/auth/login"
          className="group inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-red-600"
        >
          <ArrowLeft
            size={14}
            className="transition-colors group-hover:text-red-600"
          />
          <span className="transition-colors group-hover:text-red-600">
            {t("auth.backToLogin")}
          </span>
        </Link>
      </div>
    </Card>
  );
}

export default ForgotPassword;
