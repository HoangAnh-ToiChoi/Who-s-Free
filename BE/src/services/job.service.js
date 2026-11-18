import JobRunModel from "../models/job-run.model.js";
import { AppError } from "../controllers/errorHandle.controller.js";
import { getJob } from "../jobs/index.js";

/** Chạy một job định kỳ theo tên và ghi kết quả vào job_runs. */
class JobService {
  async run(name) {
    const job = await getJob(name);
    if (!job) throw AppError.notFound(`Không có job "${name}"`, "JOB_NOT_FOUND");
    if (job.selfLogged) return job.run();

    const runId = await JobRunModel.start(job.name);
    try {
      const stats = await job.run();
      await JobRunModel.finish(runId, { stats });
      return stats;
    } catch (error) {
      await JobRunModel.finish(runId, { error: String(error?.message ?? error).slice(0, 1000) }).catch((logError) =>
        console.error(`[jobs] không ghi được job_runs cho ${job.name}:`, logError.message),
      );
      throw error;
    }
  }
}

export default new JobService();
