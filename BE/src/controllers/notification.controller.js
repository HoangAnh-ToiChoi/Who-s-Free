import BaseController from "./BaseController.js";
import notificationService from "../services/notification.service.js";
import asyncHandler from "../utils/asyncHandler.js";

class NotificationController extends BaseController {
  /** GET /api/notifications - Thông báo của người dùng + số chưa đọc */
  list = asyncHandler(async (req, res) => {
    const data = await notificationService.list(req.user);
    return this.sendSuccess(res, data, "Lấy thông báo thành công");
  });

  /** POST /api/notifications/read - Đánh dấu đã xem (đưa số chưa đọc về 0) */
  markAllRead = asyncHandler(async (req, res) => {
    const data = await notificationService.markAllRead(req.user.id);
    return this.sendSuccess(res, data, "Đã đánh dấu đã đọc");
  });
}

export default new NotificationController();
