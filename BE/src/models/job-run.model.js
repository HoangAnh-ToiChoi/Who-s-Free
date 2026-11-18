import { query } from "../configs/db.config.js";

/** Nhật ký mỗi lần chạy job định kỳ (public.job_runs). */
class JobRunModel {
  static async start(jobName) {
    const { rows } = await query("INSERT INTO public.job_runs (job_name) VALUES ($1) RETURNING id;", [jobName]);
    return rows[0].id;
  }

  static async finish(runId, { stats = null, error = null } = {}) {
    await query("UPDATE public.job_runs SET finished_at = NOW(), stats = $2, error = $3 WHERE id = $1;", [
      runId,
      stats ? JSON.stringify(stats) : null,
      error,
    ]);
  }
}

export default JobRunModel;
