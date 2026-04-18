const { BadRequestError } = require("../core/error.response");
const { OK } = require("../core/success.response");

const modelProduct = require("../models/products.model");
const modelProductType = require("../models/productType.model");
const { uploadMultipleToCloudinary } = require("../utils/cloudinary");

const escapeRegex = (keyword = "") => keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const LEGACY_SPEC_KEYS = [
  "cpu",
  "screen",
  "gpu",
  "storage",
  "screenHz",
  "ram",
  "battery",
  "camera",
  "weight",
];

const normalizeComponentType = (componentType = "") =>
  String(componentType || "")
    .trim()
    .toLowerCase();

const normalizeColorKey = (value = "") =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeColorOptions = (colorOptions) => {
  if (colorOptions == null || colorOptions === "") {
    return [];
  }

  let parsedOptions = colorOptions;

  if (typeof parsedOptions === "string") {
    try {
      parsedOptions = JSON.parse(parsedOptions);
    } catch {
      throw new BadRequestError("colorOptions khong dung dinh dang JSON");
    }
  }

  if (!Array.isArray(parsedOptions)) {
    throw new BadRequestError("colorOptions phai la mang");
  }

  const seenNames = new Set();
  const seenKeys = new Set();
  let defaultIndex = -1;

  const normalizedOptions = parsedOptions
    .filter((item) => item && typeof item === "object")
    .map((item, index) => {
      const normalizedName = String(item.name || "").trim();
      if (!normalizedName) {
        throw new BadRequestError("Ten mau la bat buoc");
      }

      const normalizedNameKey = normalizedName.toLowerCase();
      if (seenNames.has(normalizedNameKey)) {
        throw new BadRequestError("Ten mau khong duoc trung nhau");
      }
      seenNames.add(normalizedNameKey);

      const numericPrice = Number(item.price);
      if (!Number.isFinite(numericPrice) || numericPrice < 0) {
        throw new BadRequestError(`Gia cua mau ${normalizedName} khong hop le`);
      }

      const baseKey = normalizeColorKey(item.key || normalizedName || `color-${index + 1}`) || `color-${index + 1}`;
      let resolvedKey = baseKey;
      let suffix = 2;
      while (seenKeys.has(resolvedKey)) {
        resolvedKey = `${baseKey}-${suffix}`;
        suffix += 1;
      }
      seenKeys.add(resolvedKey);

      const normalizedOption = {
        key: resolvedKey,
        name: normalizedName,
        image: String(item.image || "").trim(),
        price: numericPrice,
        isDefault: Boolean(item.isDefault),
      };

      if (normalizedOption.isDefault && defaultIndex === -1) {
        defaultIndex = index;
      }

      return normalizedOption;
    });

  if (normalizedOptions.length === 0) {
    return [];
  }

  if (defaultIndex === -1) {
    normalizedOptions[0].isDefault = true;
  } else {
    normalizedOptions.forEach((option, optionIndex) => {
      option.isDefault = optionIndex === defaultIndex;
    });
  }

  return normalizedOptions;
};

const safeNormalizeColorOptions = (colorOptions) => {
  try {
    return normalizeColorOptions(colorOptions);
  } catch {
    return [];
  }
};

const getDefaultColorOption = (colorOptions = []) => {
  if (!Array.isArray(colorOptions) || colorOptions.length === 0) {
    return null;
  }

  return colorOptions.find((item) => item?.isDefault) || colorOptions[0] || null;
};

const normalizeAttributes = (attributes) => {
  if (attributes == null) {
    return {};
  }

  let parsedAttributes = attributes;

  if (typeof parsedAttributes === "string") {
    try {
      parsedAttributes = JSON.parse(parsedAttributes);
    } catch {
      throw new BadRequestError("attributes khong dung dinh dang JSON");
    }
  }

  if (Array.isArray(parsedAttributes)) {
    const obj = {};
    parsedAttributes.forEach((item) => {
      if (!item || typeof item !== "object") {
        return;
      }
      const key = String(item.key || item.name || "").trim();
      if (!key) {
        return;
      }
      obj[key] = item.value ?? "";
    });
    return obj;
  }

  if (typeof parsedAttributes === "object") {
    const obj = {};
    Object.entries(parsedAttributes).forEach(([key, value]) => {
      const normalizedKey = String(key || "").trim();
      if (!normalizedKey) {
        return;
      }
      obj[normalizedKey] = value;
    });
    return obj;
  }

  throw new BadRequestError("attributes khong hop le");
};

const toNullableNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
};

const clampDiscount = (discount) => {
  if (!Number.isFinite(discount)) {
    return 0;
  }
  if (discount < 0) {
    return 0;
  }
  if (discount > 100) {
    return 100;
  }
  return discount;
};

const calculateDiscountedPrice = (price, discount = 0) => {
  const normalizedPrice = Number(price || 0);
  const normalizedDiscount = clampDiscount(Number(discount || 0));

  if (normalizedDiscount <= 0) {
    return normalizedPrice;
  }

  return Math.round((normalizedPrice * (100 - normalizedDiscount)) / 100);
};

const deriveDiscountFromLegacyPrice = (price, legacyPriceDiscount) => {
  const normalizedPrice = Number(price || 0);
  const normalizedLegacyPriceDiscount = Number(legacyPriceDiscount || 0);

  if (
    normalizedPrice <= 0 ||
    normalizedLegacyPriceDiscount <= 0 ||
    normalizedLegacyPriceDiscount >= normalizedPrice
  ) {
    return 0;
  }

  return clampDiscount(Math.round(((normalizedPrice - normalizedLegacyPriceDiscount) / normalizedPrice) * 100));
};

const resolveDiscountInfo = ({ price, discount, legacyPriceDiscount }) => {
  const normalizedPrice = Number(price || 0);

  let resolvedDiscount = toNullableNumber(discount);
  if (resolvedDiscount == null) {
    resolvedDiscount = deriveDiscountFromLegacyPrice(price, legacyPriceDiscount);
  }
  resolvedDiscount = clampDiscount(resolvedDiscount || 0);

  const finalPrice = calculateDiscountedPrice(normalizedPrice, resolvedDiscount);

  return {
    discount: resolvedDiscount,
    finalPrice,
    priceDiscount: resolvedDiscount > 0 ? finalPrice : 0,
  };
};

const normalizeImages = (images) => {
  if (Array.isArray(images)) {
    return images.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof images === "string") {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || "").trim()).filter(Boolean);
      }
    } catch {
      return String(images)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const buildAttributesFromLegacyProduct = (product = {}) => {
  const result = {};

  LEGACY_SPEC_KEYS.forEach((key) => {
    const value = product[key];
    if (value != null && String(value).trim() !== "") {
      result[key] = value;
    }
  });

  return result;
};

const stripLegacySpecFields = (product = {}) => {
  const sanitizedProduct = { ...product };

  LEGACY_SPEC_KEYS.forEach((key) => {
    delete sanitizedProduct[key];
  });

  return sanitizedProduct;
};

const normalizeAttributeValueByTemplate = (value, field) => {
  const inputType = String(field?.inputType || "text").trim().toLowerCase();

  if (inputType === "number") {
    if (value === "" || value == null) {
      return "";
    }
    const normalizedNumber = Number(value);
    if (!Number.isFinite(normalizedNumber)) {
      throw new BadRequestError(`Gia tri thuoc tinh ${field.label || field.key} khong hop le`);
    }
    return normalizedNumber;
  }

  const normalizedText = value == null ? "" : String(value).trim();

  if (inputType === "select") {
    const options = Array.isArray(field.options)
      ? field.options.map((option) => String(option || "").trim()).filter(Boolean)
      : [];

    if (normalizedText && options.length > 0 && !options.includes(normalizedText)) {
      throw new BadRequestError(`Gia tri thuoc tinh ${field.label || field.key} khong nam trong danh sach cho phep`);
    }
  }

  return normalizedText;
};

const ensureRequiredAttributes = (attributes, attributesTemplate = []) => {
  if (!Array.isArray(attributesTemplate) || attributesTemplate.length === 0) {
    return;
  }

  const missingFields = attributesTemplate
    .filter((field) => Boolean(field?.required))
    .filter((field) => {
      const key = String(field?.key || "").trim();
      if (!key) {
        return false;
      }
      const value = attributes[key];
      return value == null || String(value).trim() === "";
    })
    .map((field) => field.label || field.key);

  if (missingFields.length > 0) {
    throw new BadRequestError(`Ban dang thieu thong so bat buoc: ${missingFields.join(", ")}`);
  }
};

const normalizeAttributesByTemplate = (attributes, attributesTemplate = []) => {
  const normalizedAttributes = normalizeAttributes(attributes);

  if (!Array.isArray(attributesTemplate) || attributesTemplate.length === 0) {
    return normalizedAttributes;
  }

  const nextAttributes = { ...normalizedAttributes };

  attributesTemplate.forEach((field) => {
    const key = String(field?.key || "").trim();
    if (!key) {
      return;
    }

    nextAttributes[key] = normalizeAttributeValueByTemplate(nextAttributes[key], field);
  });

  return nextAttributes;
};

const isDisplayableAttributeValue = (value) => value != null && String(value).trim() !== "";

const formatSpecLabel = (key = "") =>
  String(key || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const normalizeAttributesTemplate = (attributesTemplate = []) => {
  if (!Array.isArray(attributesTemplate)) {
    return [];
  }

  return attributesTemplate
    .filter((field) => field && typeof field === "object" && field.key)
    .map((field, index) => ({
      key: String(field.key || "").trim(),
      label: String(field.label || field.key || "").trim(),
      inputType: String(field.inputType || "text").trim().toLowerCase(),
      required: Boolean(field.required),
      placeholder: String(field.placeholder || "").trim(),
      options: Array.isArray(field.options)
        ? field.options.map((option) => String(option || "").trim()).filter(Boolean)
        : [],
      order: Number.isFinite(Number(field.order)) ? Number(field.order) : index,
    }))
    .filter((field) => field.key)
    .sort((a, b) => a.order - b.order);
};

const buildSpecifications = (attributes = {}, attributesTemplate = []) => {
  const specs = [];
  const template = normalizeAttributesTemplate(attributesTemplate);
  const mappedKeys = new Set();

  template.forEach((field) => {
    const value = attributes[field.key];
    if (!isDisplayableAttributeValue(value)) {
      return;
    }

    mappedKeys.add(field.key);
    specs.push({
      key: field.key,
      label: field.label || formatSpecLabel(field.key),
      value,
    });
  });

  Object.entries(attributes).forEach(([key, value]) => {
    const normalizedKey = String(key || "").trim();

    if (!normalizedKey || mappedKeys.has(normalizedKey) || !isDisplayableAttributeValue(value)) {
      return;
    }

    specs.push({
      key: normalizedKey,
      label: formatSpecLabel(normalizedKey),
      value,
    });
  });

  return specs;
};

const buildProductTypeMap = async (products = []) => {
  const typeCodes = [...new Set(products.map((item) => normalizeComponentType(item?.componentType)).filter(Boolean))];

  if (typeCodes.length === 0) {
    return {};
  }

  const productTypes = await modelProductType.find({ code: { $in: typeCodes } }).lean();

  return productTypes.reduce((accumulator, item) => {
    accumulator[item.code] = item;
    return accumulator;
  }, {});
};

const formatProductOutput = (productDoc, productTypeDoc = null) => {
  const product = productDoc?.toObject ? productDoc.toObject() : { ...productDoc };
  const sanitizedProduct = stripLegacySpecFields(product);
  const attributes = normalizeAttributes(product.attributes || {});
  const normalizedColorOptions = safeNormalizeColorOptions(product.colorOptions);
  const defaultColorOption = getDefaultColorOption(normalizedColorOptions);
  const legacyAttributes = buildAttributesFromLegacyProduct(product);
  const resolvedAttributes = Object.keys(attributes).length > 0 ? attributes : legacyAttributes;
  const normalizedComponentType = normalizeComponentType(product.componentType);
  const attributesTemplate = normalizeAttributesTemplate(productTypeDoc?.attributesTemplate || []);
  const specifications = buildSpecifications(resolvedAttributes, attributesTemplate);

  const discountInfo = resolveDiscountInfo({
    price: product.price,
    discount: product.discount,
    legacyPriceDiscount: product.priceDiscount,
  });

  return {
    ...sanitizedProduct,
    componentType: normalizedComponentType,
    colorOptions: normalizedColorOptions,
    defaultColorKey: defaultColorOption?.key || "",
    attributes: resolvedAttributes,
    attributesTemplate,
    specifications,
    discount: discountInfo.discount,
    priceDiscount: discountInfo.priceDiscount,
    finalPrice: discountInfo.finalPrice,
  };
};

const formatProductListOutput = async (products = []) => {
  const productTypeMap = await buildProductTypeMap(products);

  return products.map((item) => {
    const product = item?.toObject ? item.toObject() : { ...item };
    const componentType = normalizeComponentType(product.componentType);
    return formatProductOutput(item, productTypeMap[componentType]);
  });
};

class controllerProducts {
  async addProduct(req, res) {
    const {
      name,
      brand,
      price,
      images,
      stock,
      attributes,
      componentType,
      discount,
      costPrice,
      priceDiscount,
      colorOptions,
    } = req.body;

    const normalizedName = String(name || "").trim();
    const normalizedBrand = String(brand || "").trim();
    const normalizedImages = normalizeImages(images);
    const normalizedComponentType = normalizeComponentType(componentType);
    const normalizedPrice = toNullableNumber(price);
    const normalizedStock = toNullableNumber(stock);
    const normalizedCostPrice = toNullableNumber(costPrice);

    if (
      !normalizedName ||
      !normalizedBrand ||
      normalizedPrice == null ||
      normalizedPrice < 0 ||
      normalizedStock == null ||
      normalizedStock < 0 ||
      normalizedImages.length === 0 ||
      !normalizedComponentType
    ) {
      throw new BadRequestError("Vui lòng nhập đầy đủ thông tin");
    }

    const productType = await modelProductType.findOne({ code: normalizedComponentType });
    if (!productType) {
      throw new BadRequestError("Loai san pham khong ton tai");
    }

    const normalizedAttributes = normalizeAttributesByTemplate(attributes, productType.attributesTemplate);
    ensureRequiredAttributes(normalizedAttributes, productType.attributesTemplate);
    const normalizedColorOptions = normalizeColorOptions(colorOptions);

    const discountInfo = resolveDiscountInfo({
      price: normalizedPrice,
      discount,
      legacyPriceDiscount: priceDiscount,
    });

    const data = await modelProduct.create({
      name: normalizedName,
      brand: normalizedBrand,
      price: normalizedPrice,
      costPrice: normalizedCostPrice || 0,
      discount: discountInfo.discount,
      priceDiscount: discountInfo.priceDiscount,
      images: normalizedImages,
      stock: normalizedStock,
      componentType: normalizedComponentType,
      attributes: normalizedAttributes,
      colorOptions: normalizedColorOptions,
    });

    new OK({
      message: "Thêm sản phẩm thành công",
      metadata: formatProductOutput(data, productType),
    }).send(res);
  }

  async uploadImage(req, res) {
    if (!req.files || req.files.length === 0) {
      throw new BadRequestError("Vui lòng tải lên ít nhất một ảnh");
    }

    try {
      // Lấy buffers từ files được upload qua multer memory storage
      const buffers = req.files.map((file) => file.buffer);

      // Upload lên Cloudinary
      const imageUrls = await uploadMultipleToCloudinary(buffers, 'mac-shop/products');

      new OK({
        message: "Tải ảnh lên thành công",
        metadata: imageUrls,
      }).send(res);
    } catch (error) {
      console.error("Upload lên Cloudinary thất bại:", error);
      throw new BadRequestError("Tải ảnh lên thất bại: " + error.message);
    }
  }

  async getProducts(req, res) {
    const limit = Number(req.query.limit);

    let query = modelProduct.find();
    if (Number.isInteger(limit) && limit > 0) {
      query = query.limit(limit);
    }

    const data = await query.sort({ createdAt: -1 });
    const formattedData = await formatProductListOutput(data);

    new OK({ message: "Lấy sản phẩm thông tin", metadata: formattedData }).send(res);
  }

  async getProductById(req, res) {
    const { id } = req.query;
    if (!id) {
      throw new BadRequestError("Không tìm thấy sản phẩm");
    }

    const data = await modelProduct.findById(id);
    if (!data) {
      throw new BadRequestError("Không tìm thấy sản phẩm");
    }

    const componentType = normalizeComponentType(data.componentType);
    const productType = componentType ? await modelProductType.findOne({ code: componentType }) : null;

    new OK({ message: "Lấy sản phẩm thông tin", metadata: formatProductOutput(data, productType) }).send(res);
  }

  async getAllProduct(req, res) {
    const data = await modelProduct.find().sort({ createdAt: -1 });
    const formattedData = await formatProductListOutput(data);
    new OK({ message: "Lấy sản phẩm thông tin", metadata: formattedData }).send(res);
  }

  async editProduct(req, res) {
    try {
      const {
        _id,
        name,
        brand,
        price,
        images,
        stock,
        attributes,
        componentType,
        discount,
        costPrice,
        priceDiscount,
        colorOptions,
      } = req.body;

      if (!_id) {
        throw new BadRequestError("ID sản phẩm không hợp lệ");
      }

      const product = await modelProduct.findById(_id);

      if (!product) {
        throw new BadRequestError("Không tìm thấy sản phẩm");
      }

      const nextComponentType = componentType
        ? normalizeComponentType(componentType)
        : normalizeComponentType(product.componentType);

      if (!nextComponentType) {
        throw new BadRequestError("Vui lòng chọn loại sản phẩm");
      }

      const productType = await modelProductType.findOne({ code: nextComponentType });
      if (!productType) {
        throw new BadRequestError("Loai san pham khong ton tai");
      }

      const currentAttributes = {
        ...buildAttributesFromLegacyProduct(product),
        ...normalizeAttributes(product.attributes || {}),
      };

      const incomingAttributes = attributes !== undefined ? normalizeAttributes(attributes) : {};

      const mergedAttributes =
        attributes !== undefined
          ? {
              ...currentAttributes,
              ...incomingAttributes,
            }
          : currentAttributes;

      const nextAttributes = normalizeAttributesByTemplate(mergedAttributes, productType.attributesTemplate);
      ensureRequiredAttributes(nextAttributes, productType.attributesTemplate);
      const persistedColorOptions = safeNormalizeColorOptions(product.colorOptions);
      const nextColorOptions = colorOptions !== undefined ? normalizeColorOptions(colorOptions) : persistedColorOptions;

      const nextPrice = toNullableNumber(price) ?? Number(product.price || 0);
      const discountInfo = resolveDiscountInfo({
        price: nextPrice,
        discount: discount ?? product.discount,
        legacyPriceDiscount: priceDiscount ?? product.priceDiscount,
      });

      const normalizedImages = images !== undefined ? normalizeImages(images) : product.images;
      const nextStock = toNullableNumber(stock);
      const nextCostPrice = toNullableNumber(costPrice);

      const updatedData = {
        name: String(name || "").trim() || product.name,
        brand: String(brand || "").trim() || product.brand,
        price: nextPrice,
        images: normalizedImages,
        stock: nextStock == null ? product.stock : nextStock,
        componentType: nextComponentType,
        attributes: nextAttributes,
        colorOptions: nextColorOptions,
        costPrice: nextCostPrice == null ? Number(product.costPrice || 0) : nextCostPrice,
        discount: discountInfo.discount,
        priceDiscount: discountInfo.priceDiscount,
      };

      if (!Array.isArray(updatedData.images) || updatedData.images.length === 0) {
        throw new BadRequestError("Vui lòng tải lên ít nhất một hình ảnh");
      }

      if (!updatedData.name || !updatedData.brand) {
        throw new BadRequestError("Vui lòng nhập đầy đủ thông tin");
      }

      if (!Number.isFinite(updatedData.price) || updatedData.price < 0) {
        throw new BadRequestError("Giá sản phẩm không hợp lệ");
      }

      if (!Number.isFinite(updatedData.stock) || updatedData.stock < 0) {
        throw new BadRequestError("Số lượng sản phẩm không hợp lệ");
      }

      const updatedProduct = await modelProduct.findByIdAndUpdate(_id, updatedData, { new: true });

      new OK({
        message: "Chỉnh sửa thông tin sản phẩm thành công",
        metadata: formatProductOutput(updatedProduct, productType),
      }).send(res);
    } catch (error) {
      throw new BadRequestError(error.message || "Lỗi khi chỉnh sửa thông tin sản phẩm");
    }
  }

  async deleteProduct(req, res) {
    const { id } = req.query;
    const product = await modelProduct.findByIdAndDelete(id);
    if (!product) {
      throw new BadRequestError("Không tìm thấy sản phẩm");
    }
    const productData = product?.toObject ? product.toObject() : { ...product };
    new OK({ message: "Xoá sản phẩm thành công", metadata: stripLegacySpecFields(productData) }).send(res);
  }

  async searchProduct(req, res) {
    const keyword = (req.query.keyword || "").trim();
    const brand = (req.query.brand || "").trim();

    const query = {};

    if (keyword) {
      const keywordRegex = { $regex: escapeRegex(keyword), $options: "i" };
      query.$or = [{ name: keywordRegex }, { brand: keywordRegex }];
    }

    if (brand && brand !== "all") {
      query.brand = { $regex: `^${escapeRegex(brand)}$`, $options: "i" };
    }

    if (!query.$or && !query.brand) {
      new OK({ message: "Tìm kiếm sản phẩm", metadata: [] }).send(res);
      return;
    }

    const data = await modelProduct.find(query).sort({ createdAt: -1 });
    const formattedData = await formatProductListOutput(data);

    new OK({ message: "Tìm kiếm sản phẩm", metadata: formattedData }).send(res);
  }

  async filterProduct(req, res) {
    const { pricedes, priceRange, brand } = req.query;
    let query = {};

    if (brand && brand !== "all") {
      query.brand = { $regex: `^${escapeRegex(brand)}$`, $options: "i" };
    }

    let products = await modelProduct.find(query);
    let data = await formatProductListOutput(products);

    if (priceRange) {
      data = data.filter((item) => {
        const finalPrice = item.priceDiscount > 0 ? item.priceDiscount : item.price;
        switch (priceRange) {
          case "under20":
            return finalPrice < 20000000;
          case "20to40":
            return finalPrice >= 20000000 && finalPrice <= 40000000;
          case "above40":
            return finalPrice > 40000000;
          default:
            return true;
        }
      });
    }

    if (pricedes === "desc") {
      data.sort((a, b) => {
        const priceA = a.priceDiscount > 0 ? a.priceDiscount : a.price;
        const priceB = b.priceDiscount > 0 ? b.priceDiscount : b.price;
        return priceB - priceA;
      });
    } else if (pricedes === "asc") {
      data.sort((a, b) => {
        const priceA = a.priceDiscount > 0 ? a.priceDiscount : a.price;
        const priceB = b.priceDiscount > 0 ? b.priceDiscount : b.price;
        return priceA - priceB;
      });
    }

    new OK({ message: "Lọc sản phẩm thành công", metadata: data }).send(res);
  }
}

module.exports = new controllerProducts();
