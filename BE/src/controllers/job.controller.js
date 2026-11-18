import { sendSuccess } from "./response.controller.js";
import jobService from "../services/job.service.js";

class JobController {
  /** POST /api/jobs/:name - Chạy job định kỳ theo tên (cron gọi, xác thực bằng x-job-secret) */
  async run(req, res) {
    const data = await jobService.run(req.params.name);
    return sendSuccess(res, data, `Đã chạy job ${req.params.name}`);
  }
}

export default new JobController();
