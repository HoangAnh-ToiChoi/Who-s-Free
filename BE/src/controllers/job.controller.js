import { sendSuccess } from "./response.controller.js";
import sessionDeadlineService from "../services/session-deadline.service.js";

class JobController {
  /** POST /api/jobs/session-deadlines - Đóng session quá hạn + gửi mail nhắc/đã đóng (cron gọi) */
  async runSessionDeadlines(req, res) {
    const data = await sessionDeadlineService.run();
    return sendSuccess(res, data, "Đã chạy job hạn session");
  }
}

export default new JobController();
