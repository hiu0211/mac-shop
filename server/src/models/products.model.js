const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const modelProduct = new Schema(
  {
    name: { type: String, require: true },
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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("product", modelProduct);
