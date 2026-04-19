const userRoutes = require("./users.routes");
const productRoutes = require("./products.routes");
const brandRoutes = require("./brands.routes");
const cartRoutes = require("./cart.routes");
const paymentsRoutes = require("./payments.routes");
const couponsRoutes = require("./coupons.routes");
const productTypeRoutes = require("./productType.routes");
const revenueRoutes = require("./revenue.route");

function routes(app) {
  app.post("/api/register", userRoutes);
  app.post("/api/login", userRoutes);
  app.post("/api/admin/login", userRoutes);
  app.post("/api/login-google", userRoutes);
  app.get("/api/auth", userRoutes);
  app.get("/api/admin/auth", userRoutes);
  app.get("/api/logout", userRoutes);
  app.get("/api/refresh-token", userRoutes);
  app.post("/api/change-password", userRoutes);
  app.get("/api/get-admin-stats", userRoutes);
  app.get("/api/get-all-users", userRoutes);
  app.post("/api/send-mail-forgot-password", userRoutes);
  app.post("/api/reset-password", userRoutes);
  app.post("/api/update-info-user", userRoutes);
  app.post("/api/update-password", userRoutes);
  app.patch("/api/update-user-role", userRoutes);
  app.patch("/api/update-user-status", userRoutes);
  app.post("/api/login-google", userRoutes);
  app.get("/admin", userRoutes);

  app.post("/api/add-product", productRoutes);
  app.post("/api/upload-image", productRoutes);
  app.get("/api/products", productRoutes);
  app.get("/api/product", productRoutes);
  app.get("/api/all-product", productRoutes);
  app.post("/api/edit-product", productRoutes);
  app.delete("/api/delete-product", productRoutes);
  app.get("/api/search-product", productRoutes);
  app.get("/api/filter-product", productRoutes);

  app.post("/api/product-types", productTypeRoutes);
  app.get("/api/product-types", productTypeRoutes);
  app.put("/api/product-types/:id", productTypeRoutes);
  app.delete("/api/product-types/:id", productTypeRoutes);
  app.get("/api/product-types/check-code", productTypeRoutes);

  app.get("/api/brands", brandRoutes);
  app.get("/api/admin/brands", brandRoutes);
  app.post("/api/admin/brands", brandRoutes);
  app.put("/api/admin/brands", brandRoutes);
  app.delete("/api/admin/brands", brandRoutes);

  app.post("/api/add-to-cart", cartRoutes);
  app.get("/api/get-cart", cartRoutes);
  app.delete("/api/delete-cart", cartRoutes);
  app.post("/api/update-info-user-cart", cartRoutes);
  app.put("/api/update-quantity-cart", cartRoutes);
  app.post("/api/payment", paymentsRoutes);
  app.get("/api/check-payment-momo", paymentsRoutes);
  app.get("/api/check-payment-vnpay", paymentsRoutes);
  app.get("/api/get-history-order", paymentsRoutes);
  app.get("/api/get-one-payment", paymentsRoutes);
  app.post("/api/update-status-order", paymentsRoutes);
  app.post("/api/cancel-order", paymentsRoutes);
  app.post("/api/reorder", paymentsRoutes);
  app.get("/api/order-contact", paymentsRoutes);
  app.post("/api/order-contact", paymentsRoutes);
  app.post("/api/order-contact-reply", paymentsRoutes);
  app.delete("/api/order-contact-message", paymentsRoutes);
  app.post("/api/review-order-product", paymentsRoutes);
  app.get("/api/admin/reviews", paymentsRoutes);
  app.post("/api/admin/reviews/reply", paymentsRoutes);
  app.delete("/api/admin/reviews", paymentsRoutes);
  app.get("/api/get-order-admin", paymentsRoutes);

  app.post("/api/admin/coupons", couponsRoutes);
  app.get("/api/admin/coupons", couponsRoutes);
  app.get("/api/admin/coupons/detail", couponsRoutes);
  app.put("/api/admin/coupons", couponsRoutes);
  app.patch("/api/admin/coupons/status", couponsRoutes);
  app.delete("/api/admin/coupons", couponsRoutes);

  app.get("/api/coupons", couponsRoutes);
  app.post("/api/coupons/validate", couponsRoutes);
  app.post("/api/coupons/apply", couponsRoutes);
  app.post("/api/coupons/remove", couponsRoutes);

  app.use("/api/revenue", revenueRoutes);
}

module.exports = routes;
