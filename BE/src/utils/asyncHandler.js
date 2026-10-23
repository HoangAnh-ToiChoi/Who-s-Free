/**
 * asyncHandler - Bọc controller handler bất đồng bộ
 * Tự động chuyển toàn bộ exception/lỗi sang next(err) để xử lý tại Global Error Middleware
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
