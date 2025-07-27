const { BadRequestError } = require("../core/error.response");
const { OK } = require("../core/success.response");

const modelProduct = require("../models/products.model");

class controllerProducts {
  async addProduct(req, res) {
    const {
      name,
      price,
      images,
      stock,
      cpu,
      screen,
      gpu,
      storage,
      screenHz,
      ram,
      battery,
      camera,
      weight,
      priceDiscount,
    } = req.body;
    if (
      !name ||
      !price ||
      !images ||
      !stock ||
      !cpu ||
      !screen ||
      !gpu ||
      !storage ||
      !screenHz ||
      !ram ||
      !battery ||
      !camera ||
      !weight
    ) {
      throw new BadRequestError("Vui lòng nhập đầy đủ thông tin");
    }

    const data = await modelProduct.create({
      name,
      price,
      priceDiscount,
      images,
      stock,
      cpu,
      screen,
      gpu,
      storage,
      screenHz,
      ram,
      battery,
      camera,
      weight,
      priceDiscount: priceDiscount || 0,
    });

    new OK({
      message: "Thêm sản phẩm thành công",
      metadata: data,
    }).send(res);
  }

  async uploadImage(req, res) {
    if (!req.files) {
      return;
    }
    const files = req.files;
    const data = files.map((file) => {
      return `http://localhost:3000/uploads/images/${file.filename}`;
    });

    new OK({ message: "Tạo sản phẩm thông tin", metadata: data }).send(res);
  }

  async getProducts(req, res) {
    const data = await modelProduct.find();
    new OK({ message: "Lấy sản phẩm thông tin", metadata: data }).send(res);
  }

  async getProductById(req, res) {
    const { id, limint } = req.query;
    const data = await modelProduct.findById(id).limit(limint);
    new OK({ message: "Lấy sản phẩm thông tin", metadata: data }).send(res);
  }

  async getAllProduct(req, res) {
    const data = await modelProduct.find();
    new OK({ message: "Lấy sản phẩm thông tin", metadata: data }).send(res);
  }

  async editProduct(req, res) {
    try {
      const { _id, name, price, description, category, attributes, images } =
        req.body;
      const product = await modelProduct.findByIdAndUpdate(_id, {
        name,
        price,
        description,
        category,
        attributes,
        images,
      });
      if (!product) {
        throw new BadRequestError("Không tìm thấy sản phẩm");
      }
      new OK({
        message: "Chiềnh sửa thống tin sản phẩm thành cong",
        metadata: product,
      }).send(res);
    } catch (error) {
      new BadRequestError({
        message: "Lỗi khi chiềnh sửa thống tin sản phẩm",
        error: error.message,
      }).send(res);
    }
  }

  async deleteProduct(req, res) {
    const { id } = req.query;
    const product = await modelProduct.findByIdAndDelete(id);
    if (!product) {
      throw new BadRequestError("Không tìm thấy sản phẩm");
    }
    new OK({ message: "Xoá sản phẩm thành công", metadata: product }).send(res);
  }

  async searchProduct(req, res) {
    const { keyword } = req.query;
    const data = await modelProduct.find({
      name: { $regex: keyword, $options: "i" },
    });
    new OK({ message: "Tìm kiếm sản phẩm", metadata: data }).send(res);
  }

  async filterProduct(req, res) {
    const { pricedes, priceRange } = req.query;
    let query = {};
    let sortOptions = {};

    // Handle price range filtering
    if (priceRange) {
      switch (priceRange) {
        case "under20":
          query.price = { $lt: 20000000 }; // Under 20 million
          break;
        case "20to40":
          query.price = { $gte: 20000000, $lte: 40000000 }; // 20-40 million
          break;
        case "above40":
          query.price = { $gt: 40000000 }; // Above 40 million
          break;
      }
    }

    // Handle price sorting
    if (pricedes === "desc") {
      sortOptions.price = -1; // High to low
    } else if (pricedes === "asc") {
      sortOptions.price = 1; // Low to high
    }

    const data = await modelProduct.find(query).sort(sortOptions);
    new OK({ message: "Lọc sản phẩm thành công", metadata: data }).send(res);
  }
}

module.exports = new controllerProducts();
