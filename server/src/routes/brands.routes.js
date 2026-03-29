const express = require("express");
const router = express.Router();

const { asyncHandler, authAdmin } = require("../auth/checkAuth");
const controllerBrands = require("../controllers/brands.controller");

router.get("/api/brands", asyncHandler(controllerBrands.getBrands));

router.get("/api/admin/brands", authAdmin, asyncHandler(controllerBrands.getBrands));
router.post("/api/admin/brands", authAdmin, asyncHandler(controllerBrands.createBrand));
router.put("/api/admin/brands", authAdmin, asyncHandler(controllerBrands.updateBrand));
router.delete("/api/admin/brands", authAdmin, asyncHandler(controllerBrands.deleteBrand));

module.exports = router;