import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Check,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import {
  validatePassword,
  validateConfirmPassword,
  getPasswordStrength,
} from "~/utils";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useAuth } from "~/hooks/useAuth";

function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { resetPassword } = useAuth();

  // Đọc thông tin đã xác thực OTP từ Router State (Zero-Wait)
  const email = location.state?.email || "";
  const otpVerified = location.state?.otpVerified || false;
  const resetToken = location.state?.resetToken || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Tiêu chí độ mạnh mật khẩu dùng chung qua hàm tiện ích
  const strength = getPasswordStrength(password, confirmPassword, t);

  const validate = () => {
    const newErrors = {};

    const passwordError = validatePassword(password, t);
    if (passwordError) newErrors.password = passwordError;

    const confirmPasswordError = validateConfirmPassword(
      password,
      confirmPassword,
      t
    );
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otpVerified || !email) return;
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      // Gọi API reset password
      await resetPassword({ email, resetToken, password, confirmPassword });
      setIsSuccess(true);
      setTimeout(() => {
        navigate("/auth/login", { state: { email } });
      }, 1500);
    } catch (err) {
      const messageKey =
        err.message === "ACCOUNT_NOT_FOUND"
          ? "auth.errors.accountNotFound"
          : "auth.errors.storageUnavailable";
      setErrors((current) => ({ ...current, form: t(messageKey) }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="rounded-2xl border border-slate-200/90 bg-white p-7 sm:p-9 shadow-sm gap-0">
      {/* Header Badge & Title */}
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200/80 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold tracking-wider text-indigo-700">
          <ShieldCheck size={12} className="text-indigo-600" />
          <span>{t("auth.badgeStep3")}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {t("auth.resetTitle")}
        </h1>
        <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
          {t("auth.resetSubtitle")}
        </p>
      </div>

      {/* Cảnh báo nếu chưa qua bước xác thực OTP */}
      {!otpVerified && !isSuccess && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-900">
                {t("auth.unauthorizedReset")}
              </p>
              <Link
                to="/auth/forgot-password"
                className="mt-1.5 inline-block text-[11px] font-bold text-amber-800 hover:text-amber-950 hover:underline"
              >
                ← {t("auth.badgeStepOtp")}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Thông báo thành công */}
      {isSuccess && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-800">
                {t("auth.resetSuccess")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form Đổi Mật Khẩu — 2 trường: Mật khẩu mới & Xác nhận mật khẩu, chống lưu autofill */}
      <form
        onSubmit={handleSubmit}
        autoComplete="off"
        className="space-y-4"
      >
        {errors.form && (
          <div role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {errors.form}
          </div>
        )}
        {/* Trường 1: Mật khẩu mới */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            {t("auth.newPassword")}
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10"
            />
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              autoComplete="new-password"
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors({ ...errors, password: null });
              }}
              placeholder={t("auth.newPasswordPlaceholder")}
              aria-invalid={!!errors.password}
              className={`h-11 w-full rounded-xl bg-slate-50/50 pl-10 pr-10 text-xs text-slate-800 placeholder:text-slate-500 transition-all focus:bg-white ${
                errors.password
                  ? "border-rose-500 bg-rose-50/40 ring-1 ring-rose-500/50 text-rose-900"
                  : "border-slate-200/90 focus:border-indigo-500 focus:ring-indigo-500/20"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer z-10"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-rose-600">
              <AlertCircle size={13} className="text-rose-500 shrink-0" />
              <span>{errors.password}</span>
            </div>
          )}
        </div>

        {/* Trường 2: Xác nhận mật khẩu */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            {t("auth.confirmPassword")}
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10"
            />
            <Input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              autoComplete="new-password"
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword)
                  setErrors({ ...errors, confirmPassword: null });
              }}
              placeholder={t("auth.confirmPasswordPlaceholder")}
              aria-invalid={!!errors.confirmPassword}
              className={`h-11 w-full rounded-xl bg-slate-50/50 pl-10 pr-10 text-xs text-slate-800 placeholder:text-slate-500 transition-all focus:bg-white ${
                errors.confirmPassword
                  ? "border-rose-500 bg-rose-50/40 ring-1 ring-rose-500/50 text-rose-900"
                  : "border-slate-200/90 focus:border-indigo-500 focus:ring-indigo-500/20"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer z-10"
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-rose-600">
              <AlertCircle size={13} className="text-rose-500 shrink-0" />
              <span>{errors.confirmPassword}</span>
            </div>
          )}
        </div>

        {/* Thanh đo độ mạnh mật khẩu và danh sách tiêu chí */}
        {password && (
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-600">
                {t("auth.passwordStrength")}
              </span>
              <span className="text-[11px] font-bold text-slate-700">
                {strength.label}
              </span>
            </div>

            {/* Thanh màu sắc hiển thị cấp độ */}
            <div className="grid grid-cols-3 gap-1.5 mb-2.5">
              <div
                className={`h-1.5 rounded-full transition-colors ${
                  strength.strengthScore >= 1 ? strength.color : "bg-slate-200"
                }`}
              />
              <div
                className={`h-1.5 rounded-full transition-colors ${
                  strength.strengthScore >= 2 ? strength.color : "bg-slate-200"
                }`}
              />
              <div
                className={`h-1.5 rounded-full transition-colors ${
                  strength.strengthScore >= 3 ? strength.color : "bg-slate-200"
                }`}
              />
            </div>

            {/* Danh sách tiêu chí kiểm tra */}
            <div className="space-y-1 text-[11px]">
              <div
                className={`flex items-center gap-1.5 ${
                  strength.isMinLength ? "text-emerald-600 font-medium" : "text-slate-500"
                }`}
              >
                <Check
                  size={12}
                  className={strength.isMinLength ? "text-emerald-500" : "text-slate-300"}
                />
                <span>{t("auth.ruleMinLength")}</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  strength.hasNumberOrSymbol
                    ? "text-emerald-600 font-medium"
                    : "text-slate-500"
                }`}
              >
                <Check
                  size={12}
                  className={
                    strength.hasNumberOrSymbol ? "text-emerald-500" : "text-slate-300"
                  }
                />
                <span>{t("auth.ruleCharTypes")}</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  strength.isMatched ? "text-emerald-600 font-medium" : "text-slate-500"
                }`}
              >
                <Check
                  size={12}
                  className={strength.isMatched ? "text-emerald-500" : "text-slate-300"}
                />
                <span>{t("auth.ruleMatch")}</span>
              </div>
            </div>
          </div>
        )}

        {/* Nút cập nhật mật khẩu — Tái sử dụng Button component */}
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting || isSuccess || !otpVerified || !email}
          className="mt-2 h-11 w-full gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-xs transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
        >
          <span>{t("auth.submitReset")}</span>
        </Button>
      </form>

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

export default ResetPassword;
