import CleanupModel from "../models/cleanup.model.js";
import SupabaseAuthModel from "../models/supabase-auth.model.js";
import { jobConfig } from "../configs/job.config.js";

export default {
  name: "unverified-accounts",
  schedule: "30 3 * * *",
  description: `Xoá tài khoản tự đăng ký mà chưa xác thực email sau ${jobConfig.unverifiedAccountDays} ngày`,
  async run() {
    const accounts = await CleanupModel.findStaleUnverifiedAccounts(jobConfig.unverifiedAccountDays);
    const results = await Promise.allSettled(
      accounts.map(async ({ id }) => {
        if (!(await CleanupModel.deletePublicUserIfUnverified(id))) return "skipped";
        await SupabaseAuthModel.deleteUser(id);
        return "deleted";
      }),
    );
    const count = (value) => results.filter((r) => r.value === value).length;
    const failedIds = accounts.filter((_, i) => results[i].status === "rejected").map((a) => a.id);
    if (failedIds.length) console.warn("[unverified-accounts] không xoá được:", failedIds.join(", "));
    return { found: accounts.length, deleted: count("deleted"), skipped: count("skipped"), failed: failedIds.length };
  },
};
