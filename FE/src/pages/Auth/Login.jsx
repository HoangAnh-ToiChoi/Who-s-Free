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
import GoogleSignInButton from "~/pages/Auth/components/GoogleSignInButton";

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
      <GoogleSignInButton returnUrl={returnUrl} />

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
