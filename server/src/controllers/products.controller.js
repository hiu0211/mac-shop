const { BadRequestError } = require("../core/error.response");
const { OK } = require("../core/success.response");

const modelProduct = require("../models/products.model");
const modelProductType = require("../models/productType.model");
const modelCategory = require("../models/category.model");
const { uploadMultipleToCloudinary } = require("../utils/cloudinary");
const { getActiveFlashSaleForProduct } = require("../services/flashSaleService");


const escapeRegex = (keyword = "") => keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");



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

const ensureRequiredSpecifications = (specifications = [], attributesTemplate = []) => {
  if (!Array.isArray(attributesTemplate) || attributesTemplate.length === 0) {
    return;
  }

  const missingFields = attributesTemplate
    .filter((field) => Boolean(field?.required))
    .filter((field) => {
      const key = String(field?.key || "").trim();
      if (!key) return false;
      const spec = specifications.find((s) => s && s.key === key);
      return !spec || spec.value == null || String(spec.value).trim() === "";
    })
    .map((field) => field.label || field.key);

  if (missingFields.length > 0) {
    throw new BadRequestError(`Ban dang thieu thong so bat buoc: ${missingFields.join(", ")}`);
  }
};

const normalizeSpecificationsByTemplate = (specifications = [], attributesTemplate = []) => {
  if (!Array.isArray(specifications)) return [];
  const templateMap = new Map();
  if (Array.isArray(attributesTemplate)) {
    attributesTemplate.forEach((t) => templateMap.set(t.key, t));
  }

  return specifications.map((spec) => {
    if (!spec || typeof spec !== 'object') return null;
    const template = templateMap.get(spec.key);
    let value = spec.value;
    if (template) {
      value = normalizeAttributeValueByTemplate(value, template);
    }
    return {
      key: String(spec.key || "").trim(),
      label: String(spec.label || spec.key || "").trim(),
      value
    };
  }).filter((s) => s && s.key && s.value != null && String(s.value).trim() !== "");
};

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

const buildCategoryMap = async (products = []) => {
  const ids = [...new Set(products.map((p) => String(p?.category || "")).filter(Boolean))];
  if (ids.length === 0) return {};

  const categories = await modelCategory.find({ _id: { $in: ids } }).lean();
  return categories.reduce((acc, item) => {
    acc[String(item._id)] = item;
    return acc;
  }, {});
};

const formatProductOutput = (productDoc, productTypeDoc = null) => {
  const product = productDoc?.toObject ? productDoc.toObject() : { ...productDoc };
  const normalizedColorOptions = safeNormalizeColorOptions(product.colorOptions);
  const defaultColorOption = getDefaultColorOption(normalizedColorOptions);
  const normalizedComponentType = normalizeComponentType(product.componentType);

  const discountInfo = resolveDiscountInfo({
    price: product.price,
    discount: product.discount,
    legacyPriceDiscount: product.priceDiscount,
  });

  return {
    ...product,
    componentType: normalizedComponentType,
    componentTypeName: String(productTypeDoc?.name || normalizedComponentType || "").trim(),
    colorOptions: normalizedColorOptions,
    defaultColorKey: defaultColorOption?.key || "",
    specifications: product.specifications || [],
    discount: discountInfo.discount,
    priceDiscount: discountInfo.priceDiscount,
    finalPrice: discountInfo.finalPrice,
  };
};

const formatProductListOutput = async (products = []) => {
  const productTypeMap = await buildProductTypeMap(products);
  const categoryMap = await buildCategoryMap(products);

  return products.map((item) => {
    const product = item?.toObject ? item.toObject() : { ...item };
    const componentType = normalizeComponentType(product.componentType);
    const base = formatProductOutput(item, productTypeMap[componentType]);

    return {
      ...base,
      categoryId: product.category ? String(product.category) : null,
      categoryName: product.category ? (categoryMap[String(product.category)]?.name || "") : "",
    };
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
      specifications,
      componentType,
      discount,
      costPrice,
      priceDiscount,
      colorOptions,
      category,
    } = req.body;

    const normalizedName = String(name || "").trim();
    const normalizedBrand = String(brand || "").trim();
    const normalizedImages = normalizeImages(images);
    const normalizedComponentType = normalizeComponentType(componentType);
    const categoryId = String(category || (req.body.categoryId || '')).trim();
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

    // Validate category existence
    if (!categoryId) {
      throw new BadRequestError('Vui lòng chọn danh mục sản phẩm');
    }

    const categoryDoc = await modelCategory.findById(categoryId);
    if (!categoryDoc) {
      throw new BadRequestError('Danh mục sản phẩm không tồn tại');
    }

    const normalizedSpecifications = normalizeSpecificationsByTemplate(specifications, productType.attributesTemplate);
    ensureRequiredSpecifications(normalizedSpecifications, productType.attributesTemplate);
    const normalizedColorOptions = normalizeColorOptions(colorOptions);

    const discountInfo = resolveDiscountInfo({
      price: normalizedPrice,
      discount,
      legacyPriceDiscount: priceDiscount,
    });

    const data = await modelProduct.create({
      name: normalizedName,
      brand: normalizedBrand,
      category: categoryDoc._id,
      price: normalizedPrice,
      costPrice: normalizedCostPrice || 0,
      discount: discountInfo.discount,
      priceDiscount: discountInfo.priceDiscount,
      images: normalizedImages,
      stock: normalizedStock,
      componentType: normalizedComponentType,
      specifications: normalizedSpecifications,
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

      // Allow optional folder param so caller can specify destination folder (e.g. brands)
      const folderParam = req.body && req.body.folder ? String(req.body.folder).trim() : '';
      const folder = folderParam || 'mac-shop/products';

      // Upload lên Cloudinary
      const imageUrls = await uploadMultipleToCloudinary(buffers, folder);

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
    const limit = Number(req.query.limit) || 12;
    const page = Number(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const total = await modelProduct.countDocuments();
    let query = modelProduct.find().skip(skip).limit(limit).sort({ createdAt: -1 });

    const data = await query;
    const formattedData = await formatProductListOutput(data);

    new OK({ 
      message: "Lấy sản phẩm thông tin", 
      metadata: {
        products: formattedData,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }).send(res);
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
    const categoryDoc = data.category ? await modelCategory.findById(data.category) : null;

    const activeFlashSale = await getActiveFlashSaleForProduct(data._id);

    const formatted = formatProductOutput(data, productType);
    const result = {
      ...formatted,
      categoryId: data.category ? String(data.category) : null,
      categoryName: categoryDoc ? categoryDoc.name : '',
      flashSale: activeFlashSale ? {
        _id: activeFlashSale._id,
        flashSalePrice: activeFlashSale.flashSalePrice,
        quantity: activeFlashSale.quantity,
        soldQuantity: activeFlashSale.soldQuantity,
        startDate: activeFlashSale.startDate,
        endDate: activeFlashSale.endDate,
      } : null,
    };

    new OK({ message: "Lấy sản phẩm thông tin", metadata: result }).send(res);
  }

  async getAllProduct(req, res) {
    const brand = String(req.query.brand || "")
      .trim();
    const componentType = normalizeComponentType(req.query.componentType || "");
    const categoryId = String(req.query.category || "").trim();

    const query = {};

    if (brand && brand !== "all") {
      query.brand = { $regex: `^${escapeRegex(brand)}$`, $options: "i" };
    }

    if (componentType && componentType !== "all") {
      query.componentType = componentType;
    }

    if (categoryId && categoryId !== "all") {
      query.category = categoryId;
    }

    const data = await modelProduct.find(query).sort({ createdAt: -1 });
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
        specifications,
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

      let nextCategoryId = product.category;
      const incomingCategoryId = (req.body.category || req.body.categoryId) ? String(req.body.category || req.body.categoryId).trim() : null;
      if (incomingCategoryId) {
        const categoryDoc = await modelCategory.findById(incomingCategoryId);
        if (!categoryDoc) {
          throw new BadRequestError('Danh mục sản phẩm không tồn tại');
        }
        nextCategoryId = categoryDoc._id;
      } else if (!product.category) {
        // If no category exists currently and none provided, require category
        throw new BadRequestError('Vui lòng chọn danh mục sản phẩm');
      }

      const incomingSpecifications = specifications !== undefined ? specifications : (product.specifications || []);
      const nextSpecifications = normalizeSpecificationsByTemplate(incomingSpecifications, productType.attributesTemplate);
      ensureRequiredSpecifications(nextSpecifications, productType.attributesTemplate);
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
        category: nextCategoryId,
        price: nextPrice,
        images: normalizedImages,
        stock: nextStock == null ? product.stock : nextStock,
        componentType: nextComponentType,
        specifications: nextSpecifications,
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
    new OK({ message: "Xoá sản phẩm thành công", metadata: productData }).send(res);
  }

  async searchProduct(req, res) {
    const keyword = (req.query.keyword || "").trim();
    const brand = (req.query.brand || "").trim();
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const query = {};

    if (keyword) {
      const keywordRegex = { $regex: escapeRegex(keyword), $options: "i" };
      query.$or = [{ name: keywordRegex }, { brand: keywordRegex }];
    }

    if (brand && brand !== "all") {
      query.brand = { $regex: `^${escapeRegex(brand)}$`, $options: "i" };
    }

    if (!query.$or && !query.brand) {
      new OK({ 
        message: "Tìm kiếm sản phẩm", 
        metadata: {
          products: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        }
      }).send(res);
      return;
    }

    const total = await modelProduct.countDocuments(query);
    const data = await modelProduct.find(query).skip(skip).limit(limit).sort({ createdAt: -1 });
    const formattedData = await formatProductListOutput(data);

    new OK({ 
      message: "Tìm kiếm sản phẩm", 
      metadata: {
        products: formattedData,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      } 
    }).send(res);
  }

  async filterProduct(req, res) {
    const { pricedes, priceRange, brand, category, minPrice, maxPrice } = req.query;
    let query = {};

    if (brand && brand !== "all") {
      query.brand = { $regex: `^${escapeRegex(brand)}$`, $options: "i" };
    }

    if (category && category !== "all") {
      query.category = category;
    }

    let products = await modelProduct.find(query);
    let data = await formatProductListOutput(products);

    if (minPrice !== undefined && maxPrice !== undefined) {
      const min = Number(minPrice);
      const max = Number(maxPrice);
      data = data.filter((item) => {
        const finalPrice = item.priceDiscount > 0 ? item.priceDiscount : item.price;
        return finalPrice >= min && finalPrice <= max;
      });
    } else if (priceRange) {
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

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 12;

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

    const total = data.length;
    const paginatedData = data.slice((page - 1) * limit, page * limit);

    new OK({ 
        message: "Lọc sản phẩm thành công", 
        metadata: {
            products: paginatedData,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        } 
    }).send(res);
  }
}

module.exports = new controllerProducts();
