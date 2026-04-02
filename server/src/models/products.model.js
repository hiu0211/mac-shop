const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const modelProduct = new Schema(
  {
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    costPrice: { type: Number, default: 0, min: 0 },
    // Ke lai truong cu de khong vo du lieu va UI cu.
    priceDiscount: { type: Number, default: 0, min: 0 },
    images: { type: [String], required: true, default: [] },
    stock: { type: Number, required: true, min: 0 },
    componentType: { type: String, trim: true, lowercase: true, default: "" },
    attributes: { type: Schema.Types.Mixed, default: {} },
    reviews: [
      {
        userId: { type: String, required: true, ref: "user" },
        orderId: { type: String, required: true, ref: "payments" },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, default: "" },
        images: { type: [String], default: [] },
        fullName: { type: String, default: "" },
        adminReply: {
          adminId: { type: String, default: "", ref: "user" },
          adminName: { type: String, default: "Shop" },
          message: { type: String, default: "" },
          repliedAt: { type: Date, default: null },
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("product", modelProduct);
