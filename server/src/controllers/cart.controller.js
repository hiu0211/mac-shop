const modelProduct = require("../models/products.model");
const modelCart = require("../models/cart.model");
const { BadRequestError } = require("../core/error.response");
const { OK } = require("../core/success.response");
const { recalculateCartTotals } = require("../services/couponService");
const mongoose = require("mongoose");

class controllerCart {
  async addToCart(req, res) {
    const { productId, quantity } = req.body;
    const { id } = req.user;
    const findProduct = await modelProduct.findById(productId);
    if (!findProduct) {
      throw new BadRequestError("Không tìm thấy sản phẩm");
    }
    
    const findCart = await modelCart.findOne({ userId: id });
    const totalPriceProduct = findProduct.price * quantity;

    if (!findCart) {
      // Kiểm tra stock trước khi tạo giỏ hàng mới
      if (quantity > findProduct.stock) {
        throw new BadRequestError("Số lượng trong kho không đủ");
      }

      const newCart = await modelCart.create({
        userId: id,
        product: [{ productId, quantity }],
        totalPrice: totalPriceProduct,
        totalPriceAfterDiscount: totalPriceProduct,
        discountAmount: 0,
        couponId: null,
        couponCode: "",
      });

      await newCart.save();

      await modelProduct.updateOne(
        { _id: productId },
        { $inc: { stock: -quantity } }
      );

      new OK({
        message: "Thêm sản phẩm vào giỏ hàng thành công",
        metadata: newCart,
      }).send(res);
    } else {
      // Kiểm tra xem sản phẩm đã tồn tại trong giỏ hàng chưa
      const existingProductIndex = findCart.product.findIndex(
        (item) => item.productId.toString() === productId
      );

      if (existingProductIndex !== -1) {
        // Sản phẩm đã tồn tại, cập nhật số lượng
        const existingQuantity = findCart.product[existingProductIndex].quantity;
        const newQuantity = existingQuantity + quantity;
        
        // Kiểm tra stock với số lượng mới
        if (newQuantity > findProduct.stock + existingQuantity) {
          throw new BadRequestError("Số lượng trong kho không đủ");
        }

        findCart.product[existingProductIndex].quantity = newQuantity;
        findCart.totalPrice += totalPriceProduct;
      } else {
        // Sản phẩm chưa tồn tại, kiểm tra stock và thêm mới
        if (quantity > findProduct.stock) {
          throw new BadRequestError("Số lượng trong kho không đủ");
        }
        
        findCart.product.push({ productId, quantity });
        findCart.totalPrice += totalPriceProduct;
      }

      await findCart.save();

      await recalculateCartTotals({ cart: findCart, userId: id });
      await findCart.save();

      await modelProduct.updateOne(
        { _id: productId },
        { $inc: { stock: -quantity } }
      );

      new OK({
        message: "Thêm sản phẩm vào giỏ hàng thành công",
        metadata: findCart,
      }).send(res);
    }
  }

  async getCart(req, res) {
    const { id } = req.user;
    const cart = await modelCart.findOne({ userId: id });
    if (!cart) {
      const newData = {
        data: [],
        totalPrice: 0,
        totalPriceAfterDiscount: 0,
        discountAmount: 0,
        couponCode: "",
      };
      new OK({ message: "Thành công", metadata: { newData } }).send(res);
      return;
    }

    if (!cart.totalPriceAfterDiscount) {
      cart.totalPriceAfterDiscount = cart.totalPrice;
    }

    const resolvedProducts = await Promise.all(
      cart.product.map(async (item) => {
        const product = await modelProduct.findById(item.productId).catch(() => null);
        if (!product) {
          return null;
        }

        return {
          product,
          productId: String(item.productId),
          quantity: item.quantity,
        };
      })
    );

    const validProducts = resolvedProducts.filter(Boolean);

    if (validProducts.length !== cart.product.length) {
      const validProductIds = new Set(validProducts.map((item) => item.productId));
      cart.product = cart.product.filter((item) => validProductIds.has(String(item.productId)));
      cart.totalPrice = validProducts.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );
      await recalculateCartTotals({ cart, userId: id });
      await cart.save();
    }

    const data = validProducts.map((item) => ({
      ...item.product.toObject(),
      quantity: item.quantity,
      price: item.product.price,
    }));

    const newData = {
      data,
      totalPrice: cart.totalPrice,
      totalPriceAfterDiscount: cart.totalPriceAfterDiscount,
      discountAmount: cart.discountAmount || 0,
      couponCode: cart.couponCode || "",
    };
    new OK({ message: "Thành công", metadata: { newData } }).send(res);
  }

  async deleteProductCart(req, res) {
    try {
      const { id } = req.user;
      const { productId } = req.query;

      const cart = await modelCart.findOne({ userId: id });
      if (!cart) {
        throw new BadRequestError("Không tìm thấy giỏ hàng");
      }

      const product = await modelProduct.findById(productId);
      if (!product) {
        throw new BadRequestError("Không tìm thấy sản phẩm");
      }

      const index = cart.product.findIndex(
        (item) => item.productId.toString() === productId
      );
      if (index === -1) {
        throw new BadRequestError("Không tìm thấy sản phẩm trong giỏ hàng");
      }

      // Lưu lại số lượng sản phẩm trước khi xoá
      const removedProduct = cart.product[index];

      // Cập nhật totalPrice trước khi xoá sản phẩm
      cart.totalPrice -= product.price * removedProduct.quantity;

      // Xoá sản phẩm khỏi giỏ hàng
      cart.product.splice(index, 1);

      await cart.save();

      await recalculateCartTotals({ cart, userId: id });
      await cart.save();

      // Cập nhật lại số lượng tồn kho
      await modelProduct.updateOne(
        { _id: productId },
        { $inc: { stock: removedProduct.quantity } }
      );

      new OK({ message: "Xoá thành công", metadata: cart }).send(res);
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }

      throw new BadRequestError(error.message || "Lỗi khi xoá sản phẩm khỏi giỏ hàng");
    }
  }

  async updateInfoUserCart(req, res) {
    const { id } = req.user;
    const { fullName, phone, address } = req.body;
    const cart = await modelCart.findOne({ userId: id });
    if (!cart) {
      throw new BadRequestError("Không tìm thấy giỏ hàng");
    }
    cart.fullName = fullName;
    cart.phone = phone;
    cart.address = address;
    await cart.save();
    new OK({ message: "Thành công", metadata: cart }).send(res);
  }

  async updateQuantity(req, res) {
  const { id } = req.user;
  const { productId, quantity } = req.body;
  const normalizedProductId = String(productId || "").trim();
  const normalizedQuantity = Number(quantity);

  if (!normalizedProductId || !mongoose.Types.ObjectId.isValid(normalizedProductId)) {
    throw new BadRequestError("Mã sản phẩm không hợp lệ");
  }

  if (!Number.isFinite(normalizedQuantity) || normalizedQuantity < 1) {
    throw new BadRequestError("Số lượng phải lớn hơn 0");
  }

  const cart = await modelCart.findOne({ userId: id });
  if (!cart) {
    throw new BadRequestError("Không tìm thấy giỏ hàng");
  }

  const product = await modelProduct.findById(normalizedProductId);
  if (!product) {
    throw new BadRequestError("Không tìm thấy sản phẩm");
  }

  const productIndex = cart.product.findIndex(
    (item) => item.productId.toString() === normalizedProductId
  );

  if (productIndex === -1) {
    throw new BadRequestError("Không tìm thấy sản phẩm trong giỏ hàng");
  }

  const currentQuantity = cart.product[productIndex].quantity;
  const quantityDiff = normalizedQuantity - currentQuantity;

  // Kiểm tra stock nếu tăng số lượng
  if (quantityDiff > 0 && quantityDiff > product.stock) {
    throw new BadRequestError("Số lượng trong kho không đủ");
  }

  // Cập nhật giá tổng (sử dụng giá gốc để thống nhất với deleteProductCart)
  const pricePerItem = product.price;
  cart.totalPrice += pricePerItem * quantityDiff;

  // Cập nhật số lượng trong giỏ hàng
  cart.product[productIndex].quantity = normalizedQuantity;

  // Cập nhật stock
  await modelProduct.updateOne(
    { _id: normalizedProductId },
    { $inc: { stock: -quantityDiff } }
  );

  await cart.save();

  await recalculateCartTotals({ cart, userId: id });
  await cart.save();

  new OK({
    message: "Cập nhật số lượng thành công",
    metadata: cart,
  }).send(res);
}

}

module.exports = new controllerCart();