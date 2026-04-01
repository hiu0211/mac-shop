const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const productTypeAttributeSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9_]+$/,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    inputType: {
      type: String,
      enum: ["text", "number", "select"],
      default: "text",
    },
    required: {
      type: Boolean,
      default: false,
    },
    placeholder: {
      type: String,
      default: "",
      trim: true,
    },
    options: {
      type: [String],
      default: [],
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const productTypeSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9-_]+$/,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    attributesTemplate: {
      type: [productTypeAttributeSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("productType", productTypeSchema);
