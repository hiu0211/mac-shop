const { BadRequestError } = require("../core/error.response");
const { OK, Created } = require("../core/success.response");

const modelProductType = require("../models/productType.model");
const modelProduct = require("../models/products.model");

const normalizeCode = (rawCode = "") =>
  String(rawCode)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

const normalizeInputType = (inputType = "text") => {
  const normalized = String(inputType || "text").trim().toLowerCase();
  if (["text", "number", "select"].includes(normalized)) {
    return normalized;
  }
  return "text";
};

const normalizeAttributesTemplate = (attributesTemplate) => {
  if (attributesTemplate == null) {
    return [];
  }

  let parsedTemplate = attributesTemplate;

  if (typeof parsedTemplate === "string") {
    try {
      parsedTemplate = JSON.parse(parsedTemplate);
    } catch {
      throw new BadRequestError("attributesTemplate khong dung dinh dang JSON");
    }
  }

  if (!Array.isArray(parsedTemplate)) {
    throw new BadRequestError("attributesTemplate phai la mang");
  }

  const normalizedTemplate = parsedTemplate.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new BadRequestError(`Thuoc tinh o vi tri ${index + 1} khong hop le`);
    }

    const rawKey = item.key || item.name || "";
    const key = String(rawKey)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

    if (!key) {
      throw new BadRequestError(`Thuoc tinh o vi tri ${index + 1} dang thieu key`);
    }

    const label = String(item.label || item.name || key).trim();
    const inputType = normalizeInputType(item.inputType || item.type);
    const required = Boolean(item.required);
    const placeholder = item.placeholder ? String(item.placeholder).trim() : "";

    let options = [];
    if (inputType === "select") {
      const rawOptions = Array.isArray(item.options)
        ? item.options
        : String(item.options || "").split(",");

      options = rawOptions
        .map((option) => String(option).trim())
        .filter(Boolean);
    }

    return {
      key,
      label,
      inputType,
      required,
      options,
      placeholder,
      order: index + 1,
    };
  });

  const keySet = new Set();
  normalizedTemplate.forEach((field) => {
    if (keySet.has(field.key)) {
      throw new BadRequestError(`Key thuoc tinh bi trung: ${field.key}`);
    }
    keySet.add(field.key);
  });

  return normalizedTemplate;
};

class ControllerProductType {
  async create(req, res) {
    const code = normalizeCode(req.body.code);
    const name = String(req.body.name || "").trim();
    const attributesTemplate = normalizeAttributesTemplate(req.body.attributesTemplate);

    if (!code || !name) {
      throw new BadRequestError("Thieu code hoac name");
    }

    const existing = await modelProductType.findOne({ code });
    if (existing) {
      throw new BadRequestError(`Ma loai san pham \"${code}\" da ton tai`);
    }

    const result = await modelProductType.create({ code, name, attributesTemplate });

    new Created({
      message: "Tao loai san pham thanh cong",
      metadata: result,
    }).send(res);
  }

  async getAll(req, res) {
    const result = await modelProductType.find().sort({ name: 1, createdAt: 1 });

    new OK({
      message: "Lay danh sach loai san pham thanh cong",
      metadata: result,
    }).send(res);
  }

  async update(req, res) {
    const { id } = req.params;

    if (!id) {
      throw new BadRequestError("Thieu id");
    }

    const code = normalizeCode(req.body.code);
    const name = String(req.body.name || "").trim();
    const attributesTemplate = normalizeAttributesTemplate(req.body.attributesTemplate);

    if (!code || !name) {
      throw new BadRequestError("Thieu code hoac name");
    }

    const item = await modelProductType.findById(id);
    if (!item) {
      throw new BadRequestError("Khong tim thay loai san pham");
    }

    const existing = await modelProductType.findOne({ code });
    if (existing && existing._id.toString() !== id.toString()) {
      throw new BadRequestError("Ma loai san pham nay da duoc su dung boi loai khac");
    }

    await item.updateOne({ code, name, attributesTemplate });
    const latest = await modelProductType.findById(id);

    new OK({
      message: "Cap nhat loai san pham thanh cong",
      metadata: latest,
    }).send(res);
  }

  async delete(req, res) {
    const { id } = req.params;
    if (!id) {
      throw new BadRequestError("Thieu id");
    }

    const item = await modelProductType.findById(id);
    if (!item) {
      throw new BadRequestError("Khong tim thay loai san pham");
    }

    const existingProduct = await modelProduct.findOne({ componentType: item.code }).select("_id");
    if (existingProduct) {
      throw new BadRequestError("Khong the xoa loai san pham dang duoc su dung");
    }

    await item.deleteOne();

    new OK({
      message: "Xoa loai san pham thanh cong",
      metadata: item,
    }).send(res);
  }

  async checkCodeExists(req, res) {
    const rawCode = req.query.code || "";
    const code = normalizeCode(rawCode);

    if (!code) {
      return new OK({
        message: "Kiem tra ma code",
        metadata: { exists: false },
      }).send(res);
    }

    const existing = await modelProductType.findOne({ code }).select("_id");

    return new OK({
      message: "Kiem tra ma code",
      metadata: { exists: Boolean(existing) },
    }).send(res);
  }
}

module.exports = new ControllerProductType();
