const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const modelCart = new Schema(
  {
    userId: { type: String, require: true, ref: "user" },
    product: [
      {
        productId: { type: String, required: true, ref: "product" },
        quantity: { type: Number, required: true },
        selectedColorKey: { type: String, default: "", trim: true, lowercase: true },
        selectedColorName: { type: String, default: "", trim: true },
        selectedColorHex: { type: String, default: "", trim: true },
        selectedColorImage: { type: String, default: "", trim: true },
        unitPrice: { type: Number, default: 0, min: 0 },
      },
    ],
    totalPrice: { type: Number, require: true },
    totalPriceAfterDiscount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    couponId: { type: String, default: null, ref: "coupon" },
    couponCode: { type: String, default: "" },
    fullName: { type: String, require: true },
    phone: { type: String, require: true },
    address: { type: String, require: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("cart", modelCart);
