const express = require("express");
const router = express.Router();

const modelUser = require("../models/users.model");

const { asyncHandler, authUser, requireRegisteredUser, authAdmin } = require("../auth/checkAuth");

const controllerUsers = require("../controllers/users.controller");

router.post("/api/register", asyncHandler(controllerUsers.register));
router.post("/api/login", asyncHandler(controllerUsers.login));
router.post("/api/admin/login", asyncHandler(controllerUsers.loginAdmin));
router.post("/api/login-google", asyncHandler(controllerUsers.loginGoogle));
router.get("/api/auth", requireRegisteredUser, asyncHandler(controllerUsers.authUser));
router.get("/api/admin/auth", authAdmin, asyncHandler(controllerUsers.authAdmin));
router.get("/api/logout", requireRegisteredUser, asyncHandler(controllerUsers.logout));
router.get("/api/refresh-token", asyncHandler(controllerUsers.refreshToken));
router.post(
  "/api/change-password",
  requireRegisteredUser,
  asyncHandler(controllerUsers.changePassword)
);
router.post(
  "/api/send-mail-forgot-password",
  asyncHandler(controllerUsers.sendMailForgotPassword)
);
router.post("/api/reset-password", asyncHandler(controllerUsers.verifyOtp));
router.post(
  "/api/update-info-user",
  requireRegisteredUser,
  asyncHandler(controllerUsers.updateInfoUser)
);
router.post(
  "/api/update-password",
  requireRegisteredUser,
  asyncHandler(controllerUsers.updatePassword)
);

router.post("/api/login-google", asyncHandler(controllerUsers.loginGoogle));

router.get(
  "/api/get-admin-stats",
  authAdmin,
  asyncHandler(controllerUsers.getAdminStats)
);
router.get(
  "/api/get-all-users",
  authAdmin,
  asyncHandler(controllerUsers.getAllUser)
);

router.patch(
  "/api/update-user-role",
  authAdmin,
  asyncHandler(controllerUsers.updateUserRole)
);

router.patch(
  "/api/update-user-status",
  authAdmin,
  asyncHandler(controllerUsers.updateUserStatus)
);

router.get("/admin", authAdmin, asyncHandler(controllerUsers.authAdmin));

module.exports = router;
