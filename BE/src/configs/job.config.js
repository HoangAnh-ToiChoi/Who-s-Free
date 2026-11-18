// Job định kỳ: cron (cron-job.org) gọi POST /api/jobs/:name kèm header x-job-secret.
export const jobConfig = {
  /** Để trống = đóng mọi endpoint job (503) */
  get secret() {
    return process.env.JOB_SECRET;
  },
  /** Mã OTP (quên mật khẩu, xác thực email) quá số ngày này thì xoá / xoá mã băm */
  otpRetentionDays: 3,
  /** Tài khoản tự đăng ký mà chưa xác thực email quá số ngày này thì xoá */
  unverifiedAccountDays: 7,
};

export default jobConfig;
