/**
 * Ghi log Audit cho các hành động bảo mật nhạy cảm
 */
const logForgotPasswordRequest = (email, req) => {
  const timestamp = new Date().toISOString();
  const clientIp =
    req.headers["x-forwarded-for"] ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown-ip";
  const userAgent = req.headers["user-agent"] || "unknown-ua";

  console.log(
    `[AUDIT - FORGOT_PASSWORD] Time: ${timestamp} | Email: ${email || "empty"} | IP: ${clientIp} | UA: ${userAgent}`
  );
};

module.exports = {
  logForgotPasswordRequest,
};
