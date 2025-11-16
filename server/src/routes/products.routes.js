const express = require("express");
const router = express.Router();

const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

let fileCounter = 0;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "src/uploads/images");
  },
  filename: function (req, file, cb) {
    // Tạo tên file duy nhất với timestamp + counter + random string
    fileCounter += 1;
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname);
    const uniqueFilename = `${timestamp}-${fileCounter}-${randomString}${ext}`;
    cb(null, uniqueFilename);
  },
});

var upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 },
});

const { asyncHandler, authUser, authAdmin } = require("../auth/checkAuth");

const controllerProducts = require("../controllers/products.controller");

router.post(
  "/api/add-product",
  authAdmin,
  upload.array("images"),
  asyncHandler(controllerProducts.addProduct)
);

router.get("/api/products", asyncHandler(controllerProducts.getProducts));

router.get("/api/product", asyncHandler(controllerProducts.getProductById));

router.post(
  "/api/upload-image",
  upload.array("images"),
  asyncHandler(controllerProducts.uploadImage)
);

router.get("/api/all-product", asyncHandler(controllerProducts.getAllProduct));

router.post("/api/edit-product", asyncHandler(controllerProducts.editProduct));

router.delete(
  "/api/delete-product",
  asyncHandler(controllerProducts.deleteProduct)
);

router.get(
  "/api/search-product",
  asyncHandler(controllerProducts.searchProduct)
);

router.get(
  "/api/filter-product",
  asyncHandler(controllerProducts.filterProduct)
);
module.exports = router;
