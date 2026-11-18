import BaseController from "./BaseController.js";
import sessionDeadlineService from "../services/session-deadline.service.js";

class JobController extends BaseController {
  /** POST /api/jobs/session-deadlines - Đóng session quá hạn + gửi mail nhắc/đã đóng (cron gọi) */
  async runSessionDeadlines(req, res) {
    const data = await sessionDeadlineService.run();
    return this.sendSuccess(res, data, "Đã chạy job hạn session");
  }
}

export default new JobController();
