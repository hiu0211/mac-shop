const modelPayments = require("../models/payments.model");
const modelCart = require("../models/cart.model");
const modelProduct = require("../models/products.model");
const modelUser = require("../models/users.model");
const {
  validateCouponForCart,
  recordCouponUsage,
  recalculateCartTotals,
} = require("../services/couponService");

const { BadRequestError } = require("../core/error.response");
const { OK } = require("../core/success.response");

const {
  VNPay,
  ignoreLogger,
  ProductCode,
  VnpLocale,
  dateFormat,
} = require("vnpay");

const validateOrderOwner = async ({ orderId, userId }) => {
  const order = await modelPayments.findById(orderId);
  if (!order) {
    throw new BadRequestError("Không tìm thấy đơn hàng");
  }

  if (order.userId.toString() !== userId.toString()) {
    throw new BadRequestError("Bạn không có quyền thao tác đơn hàng này");
  }

  return order;
};

const SUPPORTED_ORDER_STATUSES = [
  "pending",
  "completed",
  "shipping",
  "delivered",
  "cancelled",
];

class PaymentsController {
  async payment(req, res) {
    const { id } = req.user;
    const { typePayment } = req.body;
    if (!typePayment) {
      throw new BadRequestError("Vui lòng nhập đầy đủ thông tin");
    }

    const findCart = await modelCart.findOne({ userId: id });
    if (!findCart) {
      throw new BadRequestError("Không tìm thấy giỏ hàng");
    }
    if (
      findCart.address === "" ||
      findCart.phone === "" ||
      findCart.fullName === ""
    ) {
      throw new BadRequestError("Vui lòng nhập đầy đủ thông tin");
    }

    let totalPriceBeforeDiscount = findCart.totalPrice;
    let totalPriceAfterDiscount = findCart.totalPrice;
    let discountAmount = 0;
    let couponId = null;
    let couponCode = "";

    if (findCart.couponCode) {
      try {
        const validated = await validateCouponForCart({
          couponCode: findCart.couponCode,
          userId: id,
          cartTotal: findCart.totalPrice,
        });
        totalPriceAfterDiscount = validated.finalTotal;
        discountAmount = validated.discount;
        couponId = validated.coupon._id;
        couponCode = validated.coupon.code;

        findCart.totalPriceAfterDiscount = totalPriceAfterDiscount;
        findCart.discountAmount = discountAmount;
        findCart.couponId = couponId.toString();
        findCart.couponCode = couponCode;
        await findCart.save();
      } catch (error) {
        findCart.couponId = null;
        findCart.couponCode = "";
        findCart.discountAmount = 0;
        findCart.totalPriceAfterDiscount = findCart.totalPrice;
        await findCart.save();
        throw error;
      }
    }

    if (typePayment === "COD") {
      const newPayment = new modelPayments({
        userId: id,
        products: findCart.product,
        address: findCart.address,
        phone: findCart.phone,
        fullName: findCart.fullName,
        typePayments: "COD",
        totalPrice: totalPriceAfterDiscount,
        totalPriceBeforeDiscount,
        discountAmount,
        couponId: couponId ? couponId.toString() : null,
        couponCode,
        statusOrder: "pending",
      });
      await newPayment.save();

      await recordCouponUsage({
        couponId,
        userId: id,
        orderId: newPayment._id,
        discountAmount,
      });

      await findCart.deleteOne();

      new OK({
        message: "Thanh toán thành công",
        metadata: newPayment._id,
      }).send(res);
    }

    if (typePayment === "VNPAY") {
      const vnpay = new VNPay({
        tmnCode: "TRTGVZPL",
        secureSecret: "D8WRBVVHUC97AHRHNUDO6O142CEK143P",
        vnpayHost: "https://sandbox.vnpayment.vn",
        testMode: true,
        hashAlgorithm: "SHA512",
        loggerFn: ignoreLogger,
      });
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const vnpayResponse = await vnpay.buildPaymentUrl({
        vnp_Amount: totalPriceAfterDiscount,
        vnp_IpAddr: "127.0.0.1",
        vnp_TxnRef: findCart._id,
        vnp_OrderInfo: `${findCart._id}`,
        vnp_OrderType: ProductCode.Other,
        vnp_ReturnUrl: `http://localhost:3000/api/check-payment-vnpay`,
        vnp_Locale: VnpLocale.VN,
        vnp_CreateDate: dateFormat(new Date()),
        vnp_ExpireDate: dateFormat(tomorrow),
      });
      new OK({ message: "Thanh toán thông báo", metadata: vnpayResponse }).send(
        res
      );
    }
  }

  async checkPaymentVnpay(req, res) {
    const { vnp_ResponseCode, vnp_OrderInfo } = req.query;
    if (vnp_ResponseCode === "00") {
      const idCart = vnp_OrderInfo;
      const findCart = await modelCart.findOne({ _id: idCart });

      let totalPriceBeforeDiscount = findCart.totalPrice;
      let totalPriceAfterDiscount = findCart.totalPrice;
      let discountAmount = 0;
      let couponId = null;
      let couponCode = "";

      if (findCart.couponCode) {
        try {
          const validated = await validateCouponForCart({
            couponCode: findCart.couponCode,
            userId: findCart.userId,
            cartTotal: findCart.totalPrice,
          });
          totalPriceAfterDiscount = validated.finalTotal;
          discountAmount = validated.discount;
          couponId = validated.coupon._id;
          couponCode = validated.coupon.code;
        } catch (error) {
          totalPriceAfterDiscount = findCart.totalPrice;
          discountAmount = 0;
          couponId = null;
          couponCode = "";
        }
      }

      const newPayment = new modelPayments({
        userId: findCart.userId,
        products: findCart.product,
        address: findCart.address,
        phone: findCart.phone,
        typePayments: "VNPAY",
        fullName: findCart.fullName,
        totalPrice: totalPriceAfterDiscount,
        totalPriceBeforeDiscount,
        discountAmount,
        couponId: couponId ? couponId.toString() : null,
        couponCode,
      });
      await newPayment.save();

      await recordCouponUsage({
        couponId,
        userId: findCart.userId,
        orderId: newPayment._id,
        discountAmount,
      });

      await findCart.deleteOne();
      return res.redirect(`http://localhost:5173/payment/${newPayment._id}`);
    }
  }

  async getHistoryOrder(req, res) {
    const { id } = req.user;
    const payments = await modelPayments.find({ userId: id }).sort({ createdAt: -1 });

    const orders = await Promise.all(
      payments.map(async (order) => {
        const products = await Promise.all(
          order.products.map(async (item) => {
            const product = await modelProduct.findById(item.productId);
            if (!product) {
              return {
                productId: item.productId,
                name: "Sản phẩm không tồn tại",
                image: "",
                price: 0,
                quantity: item.quantity,
              };
            }

            return {
              productId: product._id,
              name: product.name,
              image: product.images[0],
              price: product.price,
              quantity: item.quantity,
            };
          })
        );

        return {
          orderId: order._id,
          fullName: order.fullName,
          phone: order.phone,
          address: order.address,
          totalPrice: order.totalPrice,
          totalPriceBeforeDiscount: order.totalPriceBeforeDiscount,
          discountAmount: order.discountAmount,
          couponCode: order.couponCode,
          typePayments: order.typePayments,
          statusOrder: order.statusOrder,
          createdAt: order.createdAt,
          reviewedProductIds: (order.productReviews || []).map((review) => review.productId?.toString()),
          contactMessages: order.contactMessages || [],
          products,
        };
      })
    );

    new OK({ message: "Thành công", metadata: { orders } }).send(res);
  }

  async getOnePayment(req, res, next) {
    try {
      const { id } = req.query;
      if (!id) {
        throw new BadRequestError("Không tìm thấy đơn hàng");
      }

      const findPayment = await modelPayments.findById(id);

      if (!findPayment) {
        throw new BadRequestError("Không tìm thấy đơn hàng");
      }

      const dataProduct = await Promise.all(
        findPayment.products.map(async (item) => {
          const product = await modelProduct.findById(item.productId);
          return {
            product: product,
            quantity: item.quantity,
          };
        })
      );
      const data = { findPayment, dataProduct };

      new OK({ message: "Thành công", metadata: data }).send(res);
    } catch (error) {
      console.log(error);
      next(error);
    }
  }

  async updateStatusOrder(req, res, next) {
    const { statusOrder, orderId } = req.body;
    const findPayment = await modelPayments.findById(orderId);
    if (!findPayment) {
      throw new BadRequestError("Không tìm thấy đơn hàng");
    }
    findPayment.statusOrder = statusOrder;
    await findPayment.save();
    new OK({ message: "Thành công", metadata: findPayment }).send(res);
  }

  async cancelOrderByUser(req, res) {
    const { id } = req.user;
    const { orderId } = req.body;

    if (!orderId) {
      throw new BadRequestError("Không tìm thấy đơn hàng");
    }

    const order = await validateOrderOwner({ orderId, userId: id });
    if (!["pending", "completed"].includes(order.statusOrder)) {
      throw new BadRequestError("Chỉ có thể hủy đơn ở trạng thái chờ xác nhận hoặc đã xác nhận");
    }

    order.statusOrder = "cancelled";
    await order.save();

    new OK({ message: "Hủy đơn hàng thành công", metadata: order }).send(res);
  }

  async reorder(req, res) {
    const { id } = req.user;
    const { orderId } = req.body;

    if (!orderId) {
      throw new BadRequestError("Không tìm thấy đơn hàng");
    }

    const order = await validateOrderOwner({ orderId, userId: id });
    if (order.statusOrder !== "cancelled") {
      throw new BadRequestError("Chỉ có thể mua lại đơn hàng đã hủy");
    }

    const products = order.products || [];
    if (!products.length) {
      throw new BadRequestError("Đơn hàng không có sản phẩm để mua lại");
    }

    const productDocs = await Promise.all(
      products.map((item) => modelProduct.findById(item.productId))
    );

    for (let i = 0; i < products.length; i += 1) {
      const orderItem = products[i];
      const product = productDocs[i];
      if (!product) {
        throw new BadRequestError("Một số sản phẩm trong đơn không còn tồn tại");
      }
      if (product.stock < orderItem.quantity) {
        throw new BadRequestError(`Sản phẩm ${product.name} không đủ tồn kho`);
      }
    }

    let cart = await modelCart.findOne({ userId: id });
    if (!cart) {
      cart = await modelCart.create({
        userId: id,
        product: [],
        totalPrice: 0,
        totalPriceAfterDiscount: 0,
        discountAmount: 0,
        couponId: null,
        couponCode: "",
      });
    }

    for (let i = 0; i < products.length; i += 1) {
      const orderItem = products[i];
      const product = productDocs[i];
      const cartItemIndex = cart.product.findIndex(
        (item) => item.productId.toString() === orderItem.productId.toString()
      );

      if (cartItemIndex >= 0) {
        cart.product[cartItemIndex].quantity += orderItem.quantity;
      } else {
        cart.product.push({
          productId: orderItem.productId,
          quantity: orderItem.quantity,
        });
      }

      cart.totalPrice += product.price * orderItem.quantity;
      product.stock -= orderItem.quantity;
    }

    await Promise.all(productDocs.map((product) => product.save()));

    await recalculateCartTotals({ cart, userId: id });
    await cart.save();

    new OK({ message: "Đã thêm sản phẩm vào giỏ hàng", metadata: cart }).send(res);
  }

  async getOrderContactMessages(req, res) {
    const { id } = req.user;
    const { orderId } = req.query;

    if (!orderId) {
      throw new BadRequestError("Không tìm thấy đơn hàng");
    }

    const order = await validateOrderOwner({ orderId, userId: id });

    new OK({
      message: "Thành công",
      metadata: {
        orderId: order._id,
        statusOrder: order.statusOrder,
        contactMessages: order.contactMessages || [],
      },
    }).send(res);
  }

  async addOrderContactMessage(req, res) {
    const { id } = req.user;
    const { orderId, message: content } = req.body;

    if (!orderId || !content || !content.trim()) {
      throw new BadRequestError("Vui lòng nhập nội dung tin nhắn");
    }

    const order = await validateOrderOwner({ orderId, userId: id });
    if (!SUPPORTED_ORDER_STATUSES.includes(order.statusOrder)) {
      throw new BadRequestError("Không thể liên hệ với đơn hàng ở trạng thái hiện tại");
    }

    const user = await modelUser.findById(id);
    order.contactMessages.push({
      senderType: "user",
      senderId: id,
      senderName: user?.fullName || "Khách hàng",
      message: content.trim(),
    });

    await order.save();

    new OK({
      message: "Gửi tin nhắn thành công",
      metadata: order.contactMessages,
    }).send(res);
  }

  async addOrderContactMessageByAdmin(req, res) {
    const { id } = req.user;
    const { orderId, message: content } = req.body;

    if (!orderId || !content || !content.trim()) {
      throw new BadRequestError("Vui lòng nhập nội dung phản hồi");
    }

    const order = await modelPayments.findById(orderId);
    if (!order) {
      throw new BadRequestError("Không tìm thấy đơn hàng");
    }

    const admin = await modelUser.findById(id);
    order.contactMessages.push({
      senderType: "admin",
      senderId: id,
      senderName: admin?.fullName || "Shop",
      message: content.trim(),
    });
    await order.save();

    new OK({
      message: "Phản hồi thành công",
      metadata: order.contactMessages,
    }).send(res);
  }

  async deleteOrderContactMessageByAdmin(req, res) {
    const { id } = req.user;
    const { orderId, messageId } = {
      ...(req.query || {}),
      ...(req.body || {}),
    };

    if (!orderId || !messageId) {
      throw new BadRequestError("Không tìm thấy tin nhắn cần xóa");
    }

    const order = await modelPayments.findById(orderId);
    if (!order) {
      throw new BadRequestError("Không tìm thấy đơn hàng");
    }

    const messageDoc = order.contactMessages.id(messageId);
    if (!messageDoc) {
      throw new BadRequestError("Không tìm thấy tin nhắn");
    }

    const actor = await modelUser.findById(id).select("isAdmin");
    const isAdmin = Boolean(actor?.isAdmin);
    const isOwnMessage = messageDoc.senderId?.toString() === id.toString();

    if (isAdmin) {
      if (!isOwnMessage || messageDoc.senderType !== "admin") {
        throw new BadRequestError("Bạn chỉ được xóa tin nhắn do chính mình gửi");
      }
    } else {
      if (order.userId.toString() !== id.toString()) {
        throw new BadRequestError("Bạn không có quyền thao tác đơn hàng này");
      }

      if (!isOwnMessage || messageDoc.senderType !== "user") {
        throw new BadRequestError("Bạn chỉ được xóa tin nhắn do chính mình gửi");
      }
    }

    messageDoc.deleteOne();
    await order.save();

    new OK({
      message: "Xóa tin nhắn thành công",
      metadata: {
        orderId: order._id,
        contactMessages: order.contactMessages,
      },
    }).send(res);
  }

  async createOrderReview(req, res) {
    const { id } = req.user;
    const { orderId, productId, rating, comment = "", images = [] } = req.body;

    if (!orderId || !productId || !rating) {
      throw new BadRequestError("Vui lòng nhập đầy đủ thông tin đánh giá");
    }

    const normalizedRating = Number(rating);
    if (Number.isNaN(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
      throw new BadRequestError("Số sao đánh giá không hợp lệ");
    }

    const order = await validateOrderOwner({ orderId, userId: id });
    if (order.statusOrder !== "delivered") {
      throw new BadRequestError("Chỉ đánh giá được đơn hàng đã giao");
    }

    const hasProductInOrder = (order.products || []).some(
      (item) => item.productId.toString() === productId.toString()
    );
    if (!hasProductInOrder) {
      throw new BadRequestError("Sản phẩm không thuộc đơn hàng này");
    }

    const alreadyReviewed = (order.productReviews || []).some(
      (item) => item.productId.toString() === productId.toString()
    );
    if (alreadyReviewed) {
      throw new BadRequestError("Bạn đã đánh giá sản phẩm này trong đơn hàng");
    }

    const product = await modelProduct.findById(productId);
    if (!product) {
      throw new BadRequestError("Không tìm thấy sản phẩm");
    }

    const user = await modelUser.findById(id);
    const safeImages = Array.isArray(images) ? images.filter((url) => typeof url === "string") : [];
    const reviewPayload = {
      productId: productId.toString(),
      rating: normalizedRating,
      comment: comment?.trim() || "",
      images: safeImages,
      createdAt: new Date(),
    };

    order.productReviews.push(reviewPayload);
    await order.save();

    product.reviews.push({
      userId: id,
      orderId: orderId.toString(),
      rating: normalizedRating,
      comment: comment?.trim() || "",
      images: safeImages,
      fullName: user?.fullName || "Khách hàng",
      createdAt: new Date(),
    });
    await product.save();

    new OK({ message: "Đánh giá thành công", metadata: reviewPayload }).send(res);
  }

  async getProductReviewsAdmin(req, res) {
    const products = await modelProduct
      .find({ "reviews.0": { $exists: true } })
      .select("name images reviews");

    const reviews = products
      .flatMap((product) =>
        (product.reviews || []).map((review) => ({
          reviewId: review._id,
          productId: product._id,
          productName: product.name,
          productImage: product.images?.[0] || "",
          userId: review.userId,
          orderId: review.orderId,
          fullName: review.fullName || "Khách hàng",
          rating: review.rating,
          comment: review.comment || "",
          images: review.images || [],
          adminReply: review.adminReply || null,
          createdAt: review.createdAt,
        }))
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    new OK({ message: "Thành công", metadata: reviews }).send(res);
  }

  async replyProductReviewByAdmin(req, res) {
    const { id } = req.user;
    const { productId, reviewId, message: replyMessage } = req.body;

    if (!productId || !reviewId || !replyMessage || !replyMessage.trim()) {
      throw new BadRequestError("Vui lòng nhập đầy đủ thông tin phản hồi");
    }

    const product = await modelProduct.findById(productId);
    if (!product) {
      throw new BadRequestError("Không tìm thấy sản phẩm");
    }

    const review = product.reviews.id(reviewId);
    if (!review) {
      throw new BadRequestError("Không tìm thấy đánh giá");
    }

    const admin = await modelUser.findById(id);
    review.adminReply = {
      adminId: id,
      adminName: admin?.fullName || "Shop",
      message: replyMessage.trim(),
      repliedAt: new Date(),
    };

    await product.save();

    new OK({ message: "Phản hồi đánh giá thành công", metadata: review }).send(res);
  }

  async deleteProductReviewByAdmin(req, res) {
    const { productId, reviewId } = {
      ...(req.query || {}),
      ...(req.body || {}),
    };

    if (!productId || !reviewId) {
      throw new BadRequestError("Không tìm thấy đánh giá cần xóa");
    }

    const product = await modelProduct.findById(productId);
    if (!product) {
      throw new BadRequestError("Không tìm thấy sản phẩm");
    }

    const review = product.reviews.id(reviewId);
    if (!review) {
      throw new BadRequestError("Không tìm thấy đánh giá");
    }

    const orderId = review.orderId;
    const reviewedProductId = product._id.toString();

    review.deleteOne();
    await product.save();

    if (orderId) {
      const order = await modelPayments.findById(orderId);
      if (order) {
        order.productReviews = (order.productReviews || []).filter(
          (item) => item.productId?.toString() !== reviewedProductId
        );
        await order.save();
      }
    }

    new OK({ message: "Xóa đánh giá thành công", metadata: { productId, reviewId } }).send(res);
  }

  async getOrderAdmin(req, res) {
    try {
      const payments = await modelPayments.find().sort({ createdAt: -1 });
      const detailedPayments = await Promise.all(
        payments.map(async (order) => {
          const products = await Promise.all(
            order.products.map(async (item) => {
              const product = await modelProduct.findById(item?.productId);
              return {
                productId: product?._id,
                name: product?.name,
                image: product?.images[0],
                price: product?.price,
                quantity: item?.quantity,
              };
            })
          );

          return {
            orderId: order._id,
            fullName: order.fullName,
            phone: order.phone,
            address: order.address,
            totalPrice: order.totalPrice,
            totalPriceBeforeDiscount: order.totalPriceBeforeDiscount,
            discountAmount: order.discountAmount,
            couponCode: order.couponCode,
            typePayments: order.typePayments,
            statusOrder: order.statusOrder,
            createdAt: order.createdAt,
            contactMessages: order.contactMessages || [],
            products,
          };
        })
      );

      new OK({
        message: "Thành công",
        metadata: detailedPayments,
      }).send(res);
    } catch (error) {
      console.log(error);
      throw new BadRequestError("Không thể lấy danh sách đơn hàng");
    }
  }
}

module.exports = new PaymentsController();