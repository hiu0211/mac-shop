const { BadRequestError, ConflictRequestError } = require("../core/error.response");
const { OK, Created } = require("../core/success.response");

const modelBrand = require("../models/brand.model");
const modelProduct = require("../models/products.model");

const normalizeBrandName = (value = "") => value.trim().replace(/\s+/g, " ");

const toSlug = (value = "") =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

class BrandsController {
  async createBrand(req, res) {
    const name = normalizeBrandName(req.body.name || "");
    const description = (req.body.description || "").trim();
    const isActive = typeof req.body.isActive === "boolean" ? req.body.isActive : true;
    const logo = String(req.body.logo || "").trim();

    if (!name) {
      throw new BadRequestError("Vui lòng nhập tên hãng sản xuất");
    }

    const slug = toSlug(name);
    if (!slug) {
      throw new BadRequestError("Tên hãng sản xuất không hợp lệ");
    }

    const existingBrand = await modelBrand.findOne({ slug });
    if (existingBrand) {
      throw new ConflictRequestError("Hãng sản xuất đã tồn tại");
    }

    const brand = await modelBrand.create({
      name,
      slug,
      description,
      logo,
      isActive,
    });

    new Created({
      message: "Thêm hãng sản xuất thành công",
      metadata: brand,
    }).send(res);
  }

  async getBrands(req, res) {
    const { active } = req.query;
    const query = {};

    if (active === "true") {
      query.isActive = true;
    }

    if (active === "false") {
      query.isActive = false;
    }

    const brands = await modelBrand.find(query).sort({ name: 1, createdAt: -1 });

    new OK({
      message: "Lấy danh sách hãng sản xuất thành công",
      metadata: brands,
    }).send(res);
  }

  async updateBrand(req, res) {
    const { id, name, description, isActive, logo } = req.body;

    if (!id) {
      throw new BadRequestError("Không tìm thấy hãng sản xuất");
    }

    const normalizedName = normalizeBrandName(name || "");
    if (!normalizedName) {
      throw new BadRequestError("Vui lòng nhập tên hãng sản xuất");
    }

    const slug = toSlug(normalizedName);
    if (!slug) {
      throw new BadRequestError("Tên hãng sản xuất không hợp lệ");
    }

    const currentBrand = await modelBrand.findById(id);
    if (!currentBrand) {
      throw new BadRequestError("Không tìm thấy hãng sản xuất");
    }

    const duplicatedBrand = await modelBrand.findOne({
      slug,
      _id: { $ne: id },
    });
    if (duplicatedBrand) {
      throw new ConflictRequestError("Hãng sản xuất đã tồn tại");
    }

    const updatePayload = {
      name: normalizedName,
      slug,
    };

    if (typeof description === "string") {
      updatePayload.description = description.trim();
    }

    if (typeof isActive === "boolean") {
      updatePayload.isActive = isActive;
    }

    if (typeof logo === 'string') {
      updatePayload.logo = String(logo || '').trim();
    }

    const updatedBrand = await modelBrand.findByIdAndUpdate(id, updatePayload, { new: true });

    if (currentBrand.name !== normalizedName) {
      await modelProduct.updateMany(
        { brand: currentBrand.name },
        { $set: { brand: normalizedName } }
      );
    }

    new OK({
      message: "Cập nhật hãng sản xuất thành công",
      metadata: updatedBrand,
    }).send(res);
  }

  async deleteBrand(req, res) {
    const { id } = req.query;

    if (!id) {
      throw new BadRequestError("Không tìm thấy hãng sản xuất");
    }

    const brand = await modelBrand.findById(id);
    if (!brand) {
      throw new BadRequestError("Không tìm thấy hãng sản xuất");
    }

    const isUsedByProducts = await modelProduct.exists({ brand: brand.name });
    if (isUsedByProducts) {
      throw new BadRequestError("Không thể xóa hãng đang có sản phẩm");
    }

    await modelBrand.findByIdAndDelete(id);

    new OK({
      message: "Xóa hãng sản xuất thành công",
      metadata: brand,
    }).send(res);
  }
}

module.exports = new BrandsController();