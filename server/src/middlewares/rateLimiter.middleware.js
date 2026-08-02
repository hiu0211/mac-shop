const { TooManyRequestsError } = require("../core/error.response");

// Lưu trữ số lần request theo key trong bộ nhớ (IP hoặc Email)
const rateLimitMap = new Map();

/**
 * Middleware Rate Limiter đơn giản trong bộ nhớ
 * @param {Object} options Configuration options
 * @param {number} options.windowMs Thời gian theo dõi (milliseconds), mặc định 15 phút
 * @param {number} options.max Số lần request tối đa cho phép trong windowMs, mặc định 3
 * @param {string} options.message Thông báo khi bị chặn
 */
const createRateLimiter = (options = {}) => {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 phút
  const max = options.max || 3;
  const message =
    options.message ||
    "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.";

  // Tự động dọn dẹp các bản ghi quá hạn mỗi 10 phút
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 10 * 60 * 1000);

  return (req, res, next) => {
    const clientIp =
      req.headers["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      req.ip ||
      "unknown-ip";
    const email = req.body?.email ? String(req.body.email).trim().toLowerCase() : "";

    // Key đánh dấu theo IP + Email (hoặc từng cái)
    const key = `forgot_pw_${clientIp}_${email}`;
    const now = Date.now();

    let record = rateLimitMap.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitMap.set(key, record);
      return next();
    }

    if (record.count >= max) {
      res.status(429).json({
        status: "error",
        code: 429,
        message,
      });
      return;
    }

    record.count += 1;
    next();
  };
};

module.exports = {
  createRateLimiter,
  forgotPasswordLimiter: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: "Bạn đã thực hiện quá nhiều yêu cầu khôi phục mật khẩu. Vui lòng thử lại sau 15 phút.",
  }),
};
