import CleanupModel from "../models/cleanup.model.js";
import { jobConfig } from "../configs/job.config.js";

export default {
  name: "otp-cleanup",
  schedule: "0 3 * * *",
  description: `Xoá OTP quên mật khẩu và mã băm xác thực email cũ hơn ${jobConfig.otpRetentionDays} ngày (giữ nhật ký gửi mã)`,
  async run() {
    const days = jobConfig.otpRetentionDays;
    const [passwordResetOtpsDeleted, emailCodesScrubbed] = await Promise.all([
      CleanupModel.deleteOldPasswordResetOtps(days),
      CleanupModel.scrubOldEmailVerificationCodes(days),
    ]);
    return { passwordResetOtpsDeleted, emailCodesScrubbed };
  },
};
