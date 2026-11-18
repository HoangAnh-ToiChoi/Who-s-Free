// Mỗi mapper nhận err, trả về { statusCode, errorCode, message, details? } hoặc null nếu không khớp.

const zodError = (err) => {
  if (err.name !== "ZodError" && !err.issues) return null;
  const issues = err.issues || [];
  return {
    statusCode: 400,
    errorCode: "VALIDATION_ERROR",
    message: issues[0]?.message || "Dữ liệu yêu cầu không hợp lệ",
    details: issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  };
};

const jwtError = (err) => {
  if (err.name === "JsonWebTokenError") {
    return {
      statusCode: 401,
      errorCode: "INVALID_TOKEN",
      message: "Mã token xác thực không hợp lệ hoặc đã bị thay đổi",
    };
  }
  if (err.name === "TokenExpiredError") {
    return {
      statusCode: 401,
      errorCode: "TOKEN_EXPIRED",
      message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    };
  }
  return null;
};

const malformedJsonError = (err) => {
  if (!(err instanceof SyntaxError && err.status === 400 && "body" in err)) return null;
  return {
    statusCode: 400,
    errorCode: "MALFORMED_JSON",
    message: "Cú pháp JSON trong request body không hợp lệ",
  };
};

const POSTGRES_ERRORS = {
  "23505": { statusCode: 409, errorCode: "RESOURCE_ALREADY_EXISTS", message: "Dữ liệu đã tồn tại trong hệ thống" },
  "23503": { statusCode: 400, errorCode: "INVALID_REFERENCE", message: "Dữ liệu liên kết không tồn tại hoặc không hợp lệ" },
  "22P02": { statusCode: 400, errorCode: "INVALID_DATA_FORMAT", message: "Định dạng dữ liệu không hợp lệ" },
};

const postgresError = (err) => POSTGRES_ERRORS[err.code] || null;

const errorMappers = [zodError, jwtError, malformedJsonError, postgresError];

export const resolveError = (err) => {
  let result = {
    statusCode: err.statusCode || 500,
    errorCode: err.errorCode,
    message: err.message || "Đã xảy ra lỗi không xác định",
    details: err.details || null,
  };
  result.errorCode ||= result.statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST";

  for (const mapper of errorMappers) {
    const mapped = mapper(err);
    if (mapped) result = { ...result, details: null, ...mapped };
  }
  return result;
};
