const userRoutes = require("./users.routes");
const productRoutes = require("./products.routes");
const cartRoutes = require("./cart.routes");
const paymentsRoutes = require("./payments.routes");

function routes(app) {
  app.post("/api/register", userRoutes);
  app.post("/api/login", userRoutes);
  app.post("/api/login-google", userRoutes);
  app.get("/api/auth", userRoutes);
  app.get("/api/logout", userRoutes);
  app.get("/api/refresh-token", userRoutes);
  app.post("/api/change-password", userRoutes);
  app.get("/api/get-admin-stats", userRoutes);
  app.get("/api/get-all-users", userRoutes);
  app.post("/api/send-mail-forgot-password", userRoutes);
  app.post("/api/reset-password", userRoutes);
  app.post("/api/update-info-user", userRoutes);
  app.post("/api/update-password", userRoutes);
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

  app.post("/api/add-to-cart", cartRoutes);
  app.get("/api/get-cart", cartRoutes);
  app.delete("/api/delete-cart", cartRoutes);
  app.post("/api/update-info-user-cart", cartRoutes);
  // app.put("/api/update-cart-quantity/:productId", cartRoutes);

  app.post("/api/payment", paymentsRoutes);
  app.get("/api/check-payment-momo", paymentsRoutes);
  app.get("/api/check-payment-vnpay", paymentsRoutes);
  app.get("/api/get-history-order", paymentsRoutes);
  app.get("/api/get-one-payment", paymentsRoutes);
  app.post("/api/update-status-order", paymentsRoutes);
  app.get("/api/get-order-admin", paymentsRoutes);
}

module.exports = routes;
