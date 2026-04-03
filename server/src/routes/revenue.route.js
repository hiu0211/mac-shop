const express = require("express");
const router = express.Router();

const revenueController = require("../controllers/revenue.controller");
const { asyncHandler, authAdmin } = require("../auth/checkAuth");

router.get(
  "/statistics",
  authAdmin,
  asyncHandler(revenueController.getRevenueStatistics)
);

module.exports = router;
