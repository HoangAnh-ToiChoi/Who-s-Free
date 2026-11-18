export const jwtConfig = {
  get secret() {
    return process.env.JWT_SECRET;
  },
  get issuer() {
    return process.env.JWT_ISSUER || "whosfree-api";
  },
  get audience() {
    return process.env.JWT_AUDIENCE || "whosfree-client";
  },
  /** Khoá HMAC băm mã OTP (dùng chung JWT_SECRET) */
  get otpSecret() {
    return process.env.JWT_SECRET || "otp-fallback-secret";
  },
};

export default jwtConfig;
