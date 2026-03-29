const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const modelProduct = new Schema(
  {
    name: { type: String, require: true },
    brand: { type: String, required: true, trim: true },
    price: { type: Number, require: true },
    priceDiscount: { type: Number, require: true },
    images: { type: Array, require: true },
    stock: { type: Number, require: true },
    cpu: { type: String, require: true },
    screen: { type: String, require: true },
    gpu: { type: String, require: true },
    storage: { type: String, require: true },
    screenHz: { type: String, require: true },
    ram: { type: String, require: true },
    battery: { type: String, require: true },
    camera: { type: String, require: true },
    weight: { type: String, require: true },
    wei: { type: String, require: true },
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
