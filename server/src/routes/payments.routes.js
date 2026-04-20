const express = require("express");
const router = express.Router();

const { asyncHandler, authUser, authAdmin } = require("../auth/checkAuth");

const controllerPayments = require("../controllers/payments.controller");

router.post("/api/payment", authUser, asyncHandler(controllerPayments.payment));

router.get(
  "/api/check-payment-momo",
  asyncHandler(controllerPayments.checkPaymentMomo)
);

router.get(
  "/api/check-payment-vnpay",
  asyncHandler(controllerPayments.checkPaymentVnpay)
);

router.get(
  "/api/get-history-order",
  authUser,
  asyncHandler(controllerPayments.getHistoryOrder)
);

router.get(
  "/api/get-one-payment",
  authUser,
  asyncHandler(controllerPayments.getOnePayment)
);

router.post(
  "/api/update-status-order",
  authAdmin,
  asyncHandler(controllerPayments.updateStatusOrder)
);

router.delete(
  "/api/delete-order",
  authAdmin,
  asyncHandler(controllerPayments.deleteOrderByAdmin)
);

router.post(
  "/api/cancel-order",
  authUser,
  asyncHandler(controllerPayments.cancelOrderByUser)
);

router.post(
  "/api/reorder",
  authUser,
  asyncHandler(controllerPayments.reorder)
);

router.get(
  "/api/order-contact",
  authUser,
  asyncHandler(controllerPayments.getOrderContactMessages)
);

router.post(
  "/api/order-contact",
  authUser,
  asyncHandler(controllerPayments.addOrderContactMessage)
);

router.post(
  "/api/order-contact-reply",
  authAdmin,
  asyncHandler(controllerPayments.addOrderContactMessageByAdmin)
);

router.delete(
  "/api/order-contact-message",
  authUser,
  asyncHandler(controllerPayments.deleteOrderContactMessageByAdmin)
);

router.post(
  "/api/review-order-product",
  authUser,
  asyncHandler(controllerPayments.createOrderReview)
);

router.get(
  "/api/admin/reviews",
  authAdmin,
  asyncHandler(controllerPayments.getProductReviewsAdmin)
);

router.post(
  "/api/admin/reviews/reply",
  authAdmin,
  asyncHandler(controllerPayments.replyProductReviewByAdmin)
);

router.delete(
  "/api/admin/reviews",
  authAdmin,
  asyncHandler(controllerPayments.deleteProductReviewByAdmin)
);

router.get(
  "/api/get-order-admin",
  authAdmin,
  asyncHandler(controllerPayments.getOrderAdmin)
);

module.exports = router;
