const modelProduct = require("../models/products.model");
const modelCart = require("../models/cart.model");
const { BadRequestError } = require("../core/error.response");
const { OK } = require("../core/success.response");
const { recalculateCartTotals } = require("../services/couponService");
const mongoose = require("mongoose");

const normalizeColorKey = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase();

const toNonNegativeNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return fallback;
  }
  return numericValue;
};

const normalizeProductColorOptions = (colorOptions = []) => {
  if (!Array.isArray(colorOptions)) {
    return [];
  }

  return colorOptions
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      key: normalizeColorKey(item.key || ""),
      name: String(item.name || "").trim(),
      hex: String(item.hex || "").trim(),
      image: String(item.image || "").trim(),
      price: toNonNegativeNumber(item.price, 0),
      isDefault: Boolean(item.isDefault),
    }))
    .filter((item) => item.key && item.name);
};

const resolveColorSnapshotForCart = ({ product, selectedColorKey }) => {
  const normalizedOptions = normalizeProductColorOptions(product?.colorOptions);
  const fallbackPrice = toNonNegativeNumber(product?.price, 0);

  if (normalizedOptions.length === 0) {
    return {
      selectedColorKey: "",
      selectedColorName: "",
      selectedColorHex: "",
      selectedColorImage: "",
      unitPrice: fallbackPrice,
      finalUnitPrice: resolveCartLineFinalUnitPrice({
        cartItem: { unitPrice: fallbackPrice },
        product,
      }),
    };
  }

  const normalizedSelectedColorKey = normalizeColorKey(selectedColorKey);
  if (!normalizedSelectedColorKey) {
    throw new BadRequestError("Vui lòng chọn màu sắc");
  }

  const matchedColor = normalizedOptions.find((item) => item.key === normalizedSelectedColorKey);
  if (!matchedColor) {
    throw new BadRequestError("Màu sắc không hợp lệ");
  }

  return {
    selectedColorKey: matchedColor.key,
    selectedColorName: matchedColor.name,
    selectedColorHex: matchedColor.hex,
    selectedColorImage: matchedColor.image,
    unitPrice: toNonNegativeNumber(matchedColor.price, fallbackPrice),
    finalUnitPrice: resolveCartLineFinalUnitPrice({
      cartItem: { unitPrice: toNonNegativeNumber(matchedColor.price, fallbackPrice) },
      product,
    }),
  };
};

const resolveItemUnitPrice = ({ cartItem, product }) => {
  const snapshotPrice = toNonNegativeNumber(cartItem?.unitPrice, -1);
  if (snapshotPrice >= 0) {
    return snapshotPrice;
  }

  const normalizedSelectedColorKey = normalizeColorKey(cartItem?.selectedColorKey);
  const normalizedOptions = normalizeProductColorOptions(product?.colorOptions);
  if (normalizedOptions.length > 0 && normalizedSelectedColorKey) {
    const matchedColor = normalizedOptions.find((item) => item.key === normalizedSelectedColorKey);
    if (matchedColor) {
      return toNonNegativeNumber(matchedColor.price, 0);
    }
  }

  return toNonNegativeNumber(product?.price, 0);
};

const resolveCartLineFinalUnitPrice = ({ cartItem, product }) => {
  const storedFinalUnitPrice = toNonNegativeNumber(cartItem?.finalUnitPrice, -1);
  if (storedFinalUnitPrice >= 0) {
    return storedFinalUnitPrice;
  }

  const baseUnitPrice = resolveItemUnitPrice({ cartItem, product });
  const discount = toNonNegativeNumber(product?.discount, 0);

  if (discount > 0) {
    return Math.max(0, Math.round((baseUnitPrice * (100 - discount)) / 100));
  }

  const legacyPriceDiscount = toNonNegativeNumber(product?.priceDiscount, 0);
  if (legacyPriceDiscount > 0 && legacyPriceDiscount < baseUnitPrice) {
    return legacyPriceDiscount;
  }

  return baseUnitPrice;
};

const resolveCartItemImage = ({ cartItem, product }) => {
  const snapshotImage = String(cartItem?.selectedColorImage || "").trim();
  if (snapshotImage) {
    return snapshotImage;
  }

  const normalizedSelectedColorKey = normalizeColorKey(cartItem?.selectedColorKey);
  const normalizedOptions = normalizeProductColorOptions(product?.colorOptions);
  if (normalizedOptions.length > 0 && normalizedSelectedColorKey) {
    const matchedColor = normalizedOptions.find((item) => item.key === normalizedSelectedColorKey);
    const matchedColorImage = String(matchedColor?.image || "").trim();
    if (matchedColorImage) {
      return matchedColorImage;
    }
  }

  const fallbackImage = Array.isArray(product?.images)
    ? product.images.map((item) => String(item || "").trim()).find(Boolean)
    : "";

  return fallbackImage || "";
};

class controllerCart {
  async addToCart(req, res) {
    const { productId, quantity, selectedColorKey } = req.body;
    const { id } = req.user;

    const normalizedProductId = String(productId || "").trim();
    const normalizedQuantity = Number(quantity);

    if (!normalizedProductId || !mongoose.Types.ObjectId.isValid(normalizedProductId)) {
      throw new BadRequestError("Mã sản phẩm không hợp lệ");
    }

    if (!Number.isFinite(normalizedQuantity) || normalizedQuantity < 1) {
      throw new BadRequestError("Số lượng phải lớn hơn 0");
    }

    const findProduct = await modelProduct.findById(normalizedProductId);
    if (!findProduct) {
      throw new BadRequestError("Không tìm thấy sản phẩm");
    }

    const findCart = await modelCart.findOne({ userId: id });
    const selectedColorSnapshot = resolveColorSnapshotForCart({
      product: findProduct,
      selectedColorKey,
    });
    const totalPriceProduct = selectedColorSnapshot.finalUnitPrice * normalizedQuantity;
    const normalizedSelectedColorKey = normalizeColorKey(selectedColorSnapshot.selectedColorKey);

    if (!findCart) {
      // Kiểm tra stock trước khi tạo giỏ hàng mới
      if (normalizedQuantity > findProduct.stock) {
        throw new BadRequestError("Số lượng trong kho không đủ");
      }

      const newCart = await modelCart.create({
        userId: id,
        product: [
          {
            productId: normalizedProductId,
            quantity: normalizedQuantity,
            selectedColorKey: selectedColorSnapshot.selectedColorKey,
            selectedColorName: selectedColorSnapshot.selectedColorName,
            selectedColorHex: selectedColorSnapshot.selectedColorHex,
            selectedColorImage: selectedColorSnapshot.selectedColorImage,
            unitPrice: selectedColorSnapshot.unitPrice,
            finalUnitPrice: selectedColorSnapshot.finalUnitPrice,
          },
        ],
        totalPrice: totalPriceProduct,
        totalPriceAfterDiscount: totalPriceProduct,
        discountAmount: 0,
        couponId: null,
        couponCode: "",
      });

      await newCart.save();

      await modelProduct.updateOne(
        { _id: normalizedProductId },
        { $inc: { stock: -normalizedQuantity } }
      );

      new OK({
        message: "Thêm sản phẩm vào giỏ hàng thành công",
        metadata: newCart,
      }).send(res);
    } else {
      // Kiểm tra xem sản phẩm đã tồn tại trong giỏ hàng chưa
      const existingProductIndex = findCart.product.findIndex(
        (item) =>
          item.productId.toString() === normalizedProductId &&
          normalizeColorKey(item.selectedColorKey) === normalizedSelectedColorKey
      );

      if (existingProductIndex !== -1) {
        // Sản phẩm đã tồn tại, cập nhật số lượng
        const existingQuantity = findCart.product[existingProductIndex].quantity;
        const newQuantity = existingQuantity + normalizedQuantity;

        // Kiểm tra stock với số lượng mới
        if (newQuantity > findProduct.stock + existingQuantity) {
          throw new BadRequestError("Số lượng trong kho không đủ");
        }

        const lineUnitPrice = resolveItemUnitPrice({
          cartItem: findCart.product[existingProductIndex],
          product: findProduct,
        });

        findCart.product[existingProductIndex].quantity = newQuantity;
        findCart.product[existingProductIndex].unitPrice = lineUnitPrice;
        findCart.product[existingProductIndex].selectedColorName =
          findCart.product[existingProductIndex].selectedColorName || selectedColorSnapshot.selectedColorName;
        findCart.product[existingProductIndex].selectedColorHex =
          findCart.product[existingProductIndex].selectedColorHex || selectedColorSnapshot.selectedColorHex;
        findCart.product[existingProductIndex].selectedColorImage =
          findCart.product[existingProductIndex].selectedColorImage || selectedColorSnapshot.selectedColorImage;
        const lineFinalUnitPrice = resolveCartLineFinalUnitPrice({
          cartItem: findCart.product[existingProductIndex],
          product: findProduct,
        });
        findCart.product[existingProductIndex].finalUnitPrice = lineFinalUnitPrice;
        findCart.totalPrice += lineFinalUnitPrice * normalizedQuantity;
      } else {
        // Sản phẩm chưa tồn tại, kiểm tra stock và thêm mới
        if (normalizedQuantity > findProduct.stock) {
          throw new BadRequestError("Số lượng trong kho không đủ");
        }

        findCart.product.push({
          productId: normalizedProductId,
          quantity: normalizedQuantity,
          selectedColorKey: selectedColorSnapshot.selectedColorKey,
          selectedColorName: selectedColorSnapshot.selectedColorName,
          selectedColorHex: selectedColorSnapshot.selectedColorHex,
          selectedColorImage: selectedColorSnapshot.selectedColorImage,
          unitPrice: selectedColorSnapshot.unitPrice,
          finalUnitPrice: selectedColorSnapshot.finalUnitPrice,
        });
        findCart.totalPrice += totalPriceProduct;
      }

      await findCart.save();

      await recalculateCartTotals({ cart: findCart, userId: id });
      await findCart.save();

      await modelProduct.updateOne(
        { _id: normalizedProductId },
        { $inc: { stock: -normalizedQuantity } }
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

          const unitPrice = resolveItemUnitPrice({ cartItem: item, product });
          const finalUnitPrice = resolveCartLineFinalUnitPrice({ cartItem: item, product });

        return {
          product,
          productId: String(item.productId),
          cartItem: item,
          quantity: item.quantity,
          unitPrice,
            finalUnitPrice,
        };
      })
    );

    const validProducts = resolvedProducts.filter(Boolean);

    if (validProducts.length !== cart.product.length) {
      cart.product = validProducts.map((item) => ({
        ...(item.cartItem?.toObject ? item.cartItem.toObject() : item.cartItem),
        unitPrice: item.unitPrice,
        finalUnitPrice: item.finalUnitPrice,
      }));
      cart.totalPrice = validProducts.reduce(
        (sum, item) => sum + item.finalUnitPrice * item.quantity,
        0
      );
      await recalculateCartTotals({ cart, userId: id });
      await cart.save();
    } else {
      let hasSnapshotChanges = false;

      cart.product.forEach((item) => {
        const productInfo = validProducts.find((resolvedItem) => String(resolvedItem.productId) === String(item.productId));
        if (!productInfo) {
          return;
        }

        const nextUnitPrice = resolveItemUnitPrice({ cartItem: item, product: productInfo.product });
        const nextFinalUnitPrice = resolveCartLineFinalUnitPrice({ cartItem: item, product: productInfo.product });
        const normalizedSelectedColorKey = normalizeColorKey(item.selectedColorKey);
        const normalizedColorOptions = normalizeProductColorOptions(productInfo.product?.colorOptions);
        const matchedColor = normalizedColorOptions.find((colorItem) => colorItem.key === normalizedSelectedColorKey);

        if (toNonNegativeNumber(item.unitPrice, -1) !== nextUnitPrice) {
          item.unitPrice = nextUnitPrice;
          hasSnapshotChanges = true;
        }

        if (toNonNegativeNumber(item.finalUnitPrice, -1) !== nextFinalUnitPrice) {
          item.finalUnitPrice = nextFinalUnitPrice;
          hasSnapshotChanges = true;
        }

        if (matchedColor) {
          if (!String(item.selectedColorName || '').trim()) {
            item.selectedColorName = matchedColor.name;
            hasSnapshotChanges = true;
          }

          if (!String(item.selectedColorHex || '').trim()) {
            item.selectedColorHex = matchedColor.hex;
            hasSnapshotChanges = true;
          }

          if (!String(item.selectedColorImage || '').trim() && String(matchedColor.image || '').trim()) {
            item.selectedColorImage = matchedColor.image;
            hasSnapshotChanges = true;
          }
        }
      });

      if (hasSnapshotChanges) {
        cart.totalPrice = validProducts.reduce(
          (sum, item) => sum + toNonNegativeNumber(item.finalUnitPrice, 0) * Number(item.quantity || 0),
          0
        );
        await recalculateCartTotals({ cart, userId: id });
        await cart.save();
      }
    }

    const data = validProducts.map((item) => {
      const liveUnitPrice = resolveCartLineFinalUnitPrice({
        cartItem: item.cartItem,
        product: item.product,
      });
      const selectedColorImage = resolveCartItemImage({
        cartItem: item.cartItem,
        product: item.product,
      });

      return {
        ...item.product.toObject(),
        productId: String(item.productId),
        cartItemKey: `${item.productId}-${item.cartItem.selectedColorKey || "default"}`,
        quantity: item.quantity,
        price: liveUnitPrice,
        unitPrice: liveUnitPrice,
        baseUnitPrice: item.unitPrice,
        selectedColorKey: normalizeColorKey(item.cartItem.selectedColorKey),
        selectedColorName: String(item.cartItem.selectedColorName || "").trim(),
        selectedColorHex: String(item.cartItem.selectedColorHex || "").trim(),
        selectedColorImage,
      };
    });

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
      const { productId, selectedColorKey } = req.query;
      const normalizedProductId = String(productId || "").trim();
      const hasSelectedColorFilter = Object.prototype.hasOwnProperty.call(req.query || {}, "selectedColorKey");
      const normalizedSelectedColorKey = normalizeColorKey(selectedColorKey);

      if (!normalizedProductId || !mongoose.Types.ObjectId.isValid(normalizedProductId)) {
        throw new BadRequestError("Mã sản phẩm không hợp lệ");
      }

      const cart = await modelCart.findOne({ userId: id });
      if (!cart) {
        throw new BadRequestError("Không tìm thấy giỏ hàng");
      }

      const product = await modelProduct.findById(normalizedProductId);
      if (!product) {
        throw new BadRequestError("Không tìm thấy sản phẩm");
      }

      const matchedIndexes = cart.product.reduce((accumulator, item, index) => {
        if (item.productId.toString() !== normalizedProductId) {
          return accumulator;
        }

        if (hasSelectedColorFilter && normalizeColorKey(item.selectedColorKey) !== normalizedSelectedColorKey) {
          return accumulator;
        }

        accumulator.push(index);
        return accumulator;
      }, []);

      if (matchedIndexes.length === 0) {
        throw new BadRequestError("Không tìm thấy sản phẩm trong giỏ hàng");
      }

      if (matchedIndexes.length > 1 && !hasSelectedColorFilter) {
        throw new BadRequestError("Vui lòng chọn đúng phiên bản màu cần xóa");
      }

      const index = matchedIndexes[0];

      // Lưu lại số lượng sản phẩm trước khi xoá
      const removedProduct = cart.product[index];
      const lineUnitPrice = resolveItemUnitPrice({
        cartItem: removedProduct,
        product,
      });
      const lineFinalUnitPrice = resolveCartLineFinalUnitPrice({
        cartItem: removedProduct,
        product,
      });

      // Cập nhật totalPrice trước khi xoá sản phẩm
      cart.totalPrice = Math.max(
        0,
        cart.totalPrice - lineFinalUnitPrice * removedProduct.quantity
      );

      // Xoá sản phẩm khỏi giỏ hàng
      cart.product.splice(index, 1);

      await cart.save();

      await recalculateCartTotals({ cart, userId: id });
      await cart.save();

      // Cập nhật lại số lượng tồn kho
      await modelProduct.updateOne(
        { _id: normalizedProductId },
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
  const { productId, quantity, selectedColorKey } = req.body;
  const hasSelectedColorFilter = Object.prototype.hasOwnProperty.call(req.body || {}, "selectedColorKey");
  const normalizedProductId = String(productId || "").trim();
  const normalizedSelectedColorKey = normalizeColorKey(selectedColorKey);
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

  const matchedIndexes = cart.product.reduce((accumulator, item, index) => {
    if (item.productId.toString() !== normalizedProductId) {
      return accumulator;
    }

    if (hasSelectedColorFilter && normalizeColorKey(item.selectedColorKey) !== normalizedSelectedColorKey) {
      return accumulator;
    }

    accumulator.push(index);
    return accumulator;
  }, []);

  if (matchedIndexes.length === 0) {
    throw new BadRequestError("Không tìm thấy sản phẩm trong giỏ hàng");
  }

  if (matchedIndexes.length > 1 && !hasSelectedColorFilter) {
    throw new BadRequestError("Vui lòng chọn đúng phiên bản màu cần cập nhật");
  }

  const productIndex = matchedIndexes[0];

  if (productIndex === -1) {
    throw new BadRequestError("Không tìm thấy sản phẩm trong giỏ hàng");
  }

  const cartItem = cart.product[productIndex];
  const currentQuantity = cartItem.quantity;
  const quantityDiff = normalizedQuantity - currentQuantity;

  // Kiểm tra stock nếu tăng số lượng
  if (quantityDiff > 0 && quantityDiff > product.stock) {
    throw new BadRequestError("Số lượng trong kho không đủ");
  }

  // Cập nhật giá tổng theo snapshot giá của dòng sản phẩm
  const pricePerItem = resolveItemUnitPrice({
    cartItem,
    product,
  });
  const finalPricePerItem = resolveCartLineFinalUnitPrice({
    cartItem,
    product,
  });
  cart.totalPrice = Math.max(0, cart.totalPrice + finalPricePerItem * quantityDiff);

  // Cập nhật số lượng trong giỏ hàng
  cart.product[productIndex].quantity = normalizedQuantity;
  cart.product[productIndex].unitPrice = pricePerItem;
  cart.product[productIndex].finalUnitPrice = finalPricePerItem;

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