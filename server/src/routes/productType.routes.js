const express = require("express");
const router = express.Router();

const { asyncHandler, authAdmin } = require("../auth/checkAuth");
const controllerProductType = require("../controllers/productType.controller");

router.post(
  "/api/product-types",
  authAdmin,
  asyncHandler(controllerProductType.create)
);

router.get(
  "/api/product-types",
  authAdmin,
  asyncHandler(controllerProductType.getAll)
);

router.put(
  "/api/product-types/:id",
  authAdmin,
  asyncHandler(controllerProductType.update)
);

router.delete(
  "/api/product-types/:id",
  authAdmin,
  asyncHandler(controllerProductType.delete)
);

router.get(
  "/api/product-types/check-code",
  authAdmin,
  asyncHandler(controllerProductType.checkCodeExists)
);

module.exports = router;
