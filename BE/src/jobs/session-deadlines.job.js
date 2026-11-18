import sessionDeadlineService from "../services/session-deadline.service.js";

export default {
  name: "session-deadlines",
  schedule: "*/10 * * * *",
  description: "Nhắc hạn lúc 20:00 hôm trước end_date và tự đóng phiên quá hạn (gửi mail cho Owner/Lead)",
  selfLogged: true,
  run: () => sessionDeadlineService.run(),
};
