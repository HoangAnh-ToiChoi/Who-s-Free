/**
 * ==============================================================================
 * WHO'S FREE - AUTHENTICATION VALIDATION & PASSWORD STRENGTH UTILITIES
 * ==============================================================================
 * Bộ hàm tiện ích kiểm tra tính hợp lệ biểu mẫu và đo độ mạnh mật khẩu dùng chung,
 * đảm bảo tái sử dụng tuyệt đối, triệt tiêu code trùng lặp theo chuẩn SRP.
 * ==============================================================================
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Kiểm tra tính hợp lệ của địa chỉ Email
 * @param {string} email
 * @param {Function} t - Hàm dịch đa ngôn ngữ i18n
 * @returns {string|null}
 */
export function validateEmail(email, t) {
  const value = (email || "").trim();
  if (!value) {
    return t("auth.errors.requiredField");
  }
  if (!EMAIL_REGEX.test(value)) {
    return t("auth.errors.invalidEmail");
  }
  return null;
}

/**
 * Kiểm tra tính hợp lệ của Họ và tên
 * @param {string} fullName
 * @param {Function} t
 * @returns {string|null}
 */
export function validateFullName(fullName, t) {
  if (!fullName || !fullName.trim()) {
    return t("auth.errors.requiredField");
  }
  return null;
}

/**
 * Kiểm tra tính hợp lệ của Mật khẩu
 * @param {string} password
 * @param {Function} t
 * @param {number} minLength
 * @returns {string|null}
 */
export function validatePassword(password, t, minLength = 8) {
  if (!password) {
    return t("auth.errors.requiredField");
  }
  if (password.length < minLength) {
    return t("auth.errors.passwordTooShort");
  }
  return null;
}

/**
 * Kiểm tra tính khớp nhau của Mật khẩu xác nhận
 * @param {string} password
 * @param {string} confirmPassword
 * @param {Function} t
 * @returns {string|null}
 */
export function validateConfirmPassword(password, confirmPassword, t) {
  if (!confirmPassword) {
    return t("auth.errors.requiredField");
  }
  if (password !== confirmPassword) {
    return t("auth.errors.passwordsDontMatch");
  }
  return null;
}

/**
 * Kiểm tra xác nhận Điều khoản dịch vụ
 * @param {boolean} agreeTerms
 * @param {Function} t
 * @returns {string|null}
 */
export function validateTerms(agreeTerms, t) {
  if (!agreeTerms) {
    return t("auth.errors.termsRequired");
  }
  return null;
}

/**
 * Đo độ mạnh mật khẩu và trả về điểm số, nhãn hiển thị và màu thanh tiến trình
 * @param {string} password
 * @param {string} confirmPassword
 * @param {Function} t
 * @returns {{
 *   isMinLength: boolean,
 *   hasNumberOrSymbol: boolean,
 *   isMatched: boolean,
 *   strengthScore: number,
 *   label: string,
 *   color: string
 * }}
 */
export function getPasswordStrength(password, confirmPassword = "", t) {
  const pwd = password || "";
  const isMinLength = pwd.length >= 8;
  const hasNumberOrSymbol = /[\d\W]/.test(pwd);
  const isMatched = pwd.length > 0 && pwd === confirmPassword;

  const strengthScore =
    (isMinLength ? 1 : 0) + (hasNumberOrSymbol ? 1 : 0) + (isMatched ? 1 : 0);

  let label = t("auth.strengthWeak");
  let color = "bg-rose-500";

  if (strengthScore === 2) {
    label = t("auth.strengthFair");
    color = "bg-amber-500";
  } else if (strengthScore >= 3) {
    label = t("auth.strengthStrong");
    color = "bg-emerald-500";
  }

  return {
    isMinLength,
    hasNumberOrSymbol,
    isMatched,
    strengthScore,
    label,
    color,
  };
}
