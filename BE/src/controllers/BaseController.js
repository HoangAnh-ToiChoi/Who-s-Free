import ApiResponse from "../utils/ApiResponse.js";

/**
 * BaseController - Class cha cho toàn bộ Controller trong hệ thống
 */
class BaseController {
  // Gắn sẵn this cho mọi method để truyền thẳng vào route: router.get("/", controller.method)
  constructor() {
    const proto = Object.getPrototypeOf(this);
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (name !== "constructor" && typeof proto[name] === "function") {
        this[name] = proto[name].bind(this);
      }
    }
  }

  sendSuccess(res, data, message = "Thành công", statusCode = 200) {
    return res.status(statusCode).json(ApiResponse.success(data, message));
  }

  sendCreated(res, data, message = "Tạo thành công") {
    return res.status(201).json(ApiResponse.success(data, message));
  }

  sendError(res, error, message = "Đã xảy ra lỗi", statusCode = 400) {
    return res.status(statusCode).json(ApiResponse.error(error, message));
  }
}

export default BaseController;
