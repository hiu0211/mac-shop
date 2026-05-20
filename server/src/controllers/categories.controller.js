const { BadRequestError, ConflictRequestError } = require("../core/error.response");
const { OK, Created } = require("../core/success.response");

const modelCategory = require("../models/category.model");
const modelProduct = require("../models/products.model");

const normalizeName = (value = "") => value.trim().replace(/\s+/g, " ");

const toSlug = (value = "") =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

class CategoriesController {
  async create(req, res) {
    const name = normalizeName(req.body.name || "");
    const description = (req.body.description || "").trim();
    const image = (req.body.image || "").trim();
    const isActive = typeof req.body.isActive === "boolean" ? req.body.isActive : true;

    if (!name) {
      throw new BadRequestError("Vui lòng nhập tên danh mục");
    }

    const slug = toSlug(name);
    if (!slug) {
      throw new BadRequestError("Tên danh mục không hợp lệ");
    }

    const existing = await modelCategory.findOne({ slug });
    if (existing) {
      throw new ConflictRequestError("Danh mục đã tồn tại");
    }

    const category = await modelCategory.create({ name, slug, description, image, isActive });

    new Created({ message: "Tạo danh mục thành công", metadata: category }).send(res);
  }

  async getAll(req, res) {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 10, 1);
    const search = String(req.query.search || "").trim();

    const query = {};
    if (search) {
      query.name = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    }

    const total = await modelCategory.countDocuments(query);
    const data = await modelCategory.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);

    // Attach product counts
    const result = await Promise.all(
      data.map(async (cat) => {
        const count = await modelProduct.countDocuments({ category: cat._id });
        return { ...cat.toObject(), productCount: count };
      })
    );

    new OK({ message: "Lấy danh mục thành công", metadata: { data: result, total, page, limit } }).send(res);
  }

  async getById(req, res) {
    const { id } = req.params;
    if (!id) {
      throw new BadRequestError("Thiếu id danh mục");
    }

    const category = await modelCategory.findById(id);
    if (!category) {
      throw new BadRequestError("Không tìm thấy danh mục");
    }

    const productCount = await modelProduct.countDocuments({ category: category._id });

    new OK({ message: "Lấy danh mục thành công", metadata: { ...category.toObject(), productCount } }).send(res);
  }

  async update(req, res) {
    const { id } = req.params;
    if (!id) {
      throw new BadRequestError("Thiếu id danh mục");
    }

    const name = normalizeName(req.body.name || "");
    const description = typeof req.body.description === "string" ? req.body.description.trim() : undefined;
    const image = typeof req.body.image === "string" ? req.body.image.trim() : undefined;
    const isActive = typeof req.body.isActive === "boolean" ? req.body.isActive : undefined;

    const category = await modelCategory.findById(id);
    if (!category) {
      throw new BadRequestError("Không tìm thấy danh mục");
    }

    if (!name) {
      throw new BadRequestError("Vui lòng nhập tên danh mục");
    }

    const slug = toSlug(name);
    const duplicated = await modelCategory.findOne({ slug, _id: { $ne: id } });
    if (duplicated) {
      throw new ConflictRequestError("Danh mục đã tồn tại");
    }

    const updatePayload = { name, slug };
    if (description !== undefined) updatePayload.description = description;
    if (image !== undefined) updatePayload.image = image;
    if (isActive !== undefined) updatePayload.isActive = isActive;

    const updated = await modelCategory.findByIdAndUpdate(id, updatePayload, { new: true });

    new OK({ message: "Cập nhật danh mục thành công", metadata: updated }).send(res);
  }

  async delete(req, res) {
    const { id } = req.params;
    if (!id) {
      throw new BadRequestError("Thiếu id danh mục");
    }

    const category = await modelCategory.findById(id);
    if (!category) {
      throw new BadRequestError("Không tìm thấy danh mục");
    }

    const isUsed = await modelProduct.exists({ category: category._id });
    if (isUsed) {
      throw new BadRequestError("Danh mục đang có sản phẩm, không thể xoá");
    }

    await modelCategory.findByIdAndDelete(id);

    new OK({ message: "Xóa danh mục thành công", metadata: category }).send(res);
  }

  async getAllActive(req, res) {
    const categories = await modelCategory.find({ isActive: true }).sort({ name: 1 });

    const result = await Promise.all(
      categories.map(async (cat) => {
        const brands = await modelProduct.distinct("brand", { category: cat._id });
        return { ...cat.toObject(), brands };
      })
    );

    new OK({ message: "Lấy danh mục active thành công", metadata: result }).send(res);
  }
}

module.exports = new CategoriesController();
