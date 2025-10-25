const modelProduct = require("../models/products.model");
const modelCart = require("../models/cart.model");
const { BadRequestError } = require("../core/error.response");
const { OK } = require("../core/success.response");

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
      throw new BadRequestError("Không tìm thấy giỏ hàng");
    }

    const data = await Promise.all(
      cart.product.map(async (item) => {
        const product = await modelProduct.findById(item.productId);
        return {
          ...product._doc,
          quantity: item.quantity,
          price:
            product.priceDiscount > 0 ? product.priceDiscount : product.price,
        };
      })
    );

    const newData = {
      data,
      totalPrice: cart.totalPrice,
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

      // Cập nhật lại số lượng tồn kho
      await modelProduct.updateOne(
        { _id: productId },
        { $inc: { stock: removedProduct.quantity } }
      );

      new OK({ message: "Xoá thành công", metadata: cart }).send(res);
    } catch (error) {
      new BadRequestError(error.message).send(res);
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
}

module.exports = new controllerCart();