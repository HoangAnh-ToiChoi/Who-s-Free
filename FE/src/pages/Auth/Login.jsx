import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from "lucide-react";
import { validateEmail, validatePassword } from "~/utils";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useAuth } from "~/hooks/useAuth";
import { getSafeReturnUrl } from "~/utils/safeReturnUrl";
import { backendUrl } from "~/utils/backendApi";

function Login() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const searchParams = new URLSearchParams(location.search);
  const returnUrl = getSafeReturnUrl(location.search);

  const [formData, setFormData] = useState(() => ({
    email: location.state?.email || searchParams.get("email") || "",
    password: "",
  }));

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState(() => ({
    form: location.state?.formError || null,
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors = {};
    const emailError = validateEmail(formData.email, t);
    if (emailError) newErrors.email = emailError;

    const passwordError = validatePassword(formData.password, t);
    if (passwordError) newErrors.password = passwordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await login(formData);
      navigate(returnUrl, { replace: true });
    } catch (error) {
      const messageKey =
        error.message === "INVALID_CREDENTIALS"
          ? "auth.errors.invalidCredentials"
          : "auth.errors.storageUnavailable";
      setErrors((current) => ({
        ...current,
        form: t(messageKey, { defaultValue: error.message || t("auth.errors.invalidCredentials") }),
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    const params = new URLSearchParams({ returnUrl });
    window.location.href = `${backendUrl("/auth/google")}?${params}`;
  };

  return (
    <Card className="rounded-2xl border border-slate-200/90 bg-white p-7 sm:p-9 shadow-sm gap-0">
      {/* Header Badge & Title */}
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200/80 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold tracking-wider text-indigo-700">
          <Lock size={12} className="text-indigo-600" />
          <span>{t("auth.badgeLogin")}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {t("auth.loginTitle")}
        </h1>
        <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
          {t("auth.loginSubtitle")}
        </p>
      </div>

      {location.state?.registrationSuccess && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs font-medium text-emerald-800"
        >
          {t("auth.registerSuccess")}
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
        {errors.form && (
          <div role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {errors.form}
          </div>
        )}
        {/* Email Field — Tái sử dụng component Input */}
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
              value={formData.email}
              autoComplete="off"
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: null });
              }}
              placeholder={t("auth.emailPlaceholder")}
              aria-invalid={!!errors.email}
              className={`h-11 w-full rounded-xl bg-slate-50/50 pl-10 pr-3.5 text-xs text-slate-800 placeholder:text-slate-500 transition-all focus:bg-white ${
                errors.email
                  ? "border-rose-500 bg-rose-50/40 ring-1 ring-rose-500/50 text-rose-900"
                  : "border-slate-200/90 focus:border-indigo-500 focus:ring-indigo-500/20"
              }`}
            />
          </div>
          {errors.email && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-rose-600">
              <AlertCircle size={13} className="text-rose-500 shrink-0" />
              <span>{errors.email}</span>
            </div>
          )}
        </div>

        {/* Password Field — Tái sử dụng component Input */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            {t("auth.password")}
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10"
            />
            <Input
              type={showPassword ? "text" : "password"}
              value={formData.password}
              autoComplete="new-password"
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                if (errors.password) setErrors({ ...errors, password: null });
              }}
              placeholder={t("auth.passwordPlaceholder")}
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

        {/* Forgot Password Link */}
        <div className="flex items-center justify-end pt-0.5">
          <Link
            to="/auth/forgot-password"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            {t("auth.forgotPasswordLink")}
          </Link>
        </div>

        {/* Submit Button — Tái sử dụng component Button */}
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="mt-2 h-11 w-full gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-xs transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
        >
          <span>{t("auth.submitLogin")}</span>
          <ArrowRight size={15} />
        </Button>
      </form>

      {/* Divider */}
      <div className="relative my-6 flex items-center justify-center">
        <div className="w-full border-t border-slate-200" />
        <span className="absolute bg-white px-3 text-[11px] font-medium text-slate-500">
          {t("auth.orContinueWith")}
        </span>
      </div>

      {/* Google SSO Button — Nằm ở dưới như các ứng dụng social */}
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={handleGoogleLogin}
        className="h-11 w-full gap-3 rounded-xl border-slate-200/90 bg-white text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all cursor-pointer"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>{t("auth.continueGoogle")}</span>
      </Button>

      {/* Switch to Register */}
      <div className="mt-6 text-center text-xs text-slate-500">
        <span>{t("auth.noAccount")} </span>
        <Link
          to={`/auth/register${location.search}`}
          className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
        >
          {t("auth.signUpNow")}
        </Link>
      </div>
    </Card>
  );
}

export default Login;
