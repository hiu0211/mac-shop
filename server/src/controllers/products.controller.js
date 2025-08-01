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
    const { _id, name, price, images, stock, cpu, screen, gpu, storage, screenHz, ram, battery, camera, weight, priceDiscount } = req.body;

    // Kiểm tra xem có ID và ít nhất một trường cần sửa không
    if (!_id) {
      return new BadRequestError("ID sản phẩm không hợp lệ").send(res);
    }

    // Lấy thông tin sản phẩm cũ
    const product = await modelProduct.findById(_id);

    if (!product) {
      throw new BadRequestError("Không tìm thấy sản phẩm");
    }

    // Tạo object cập nhật với những trường đã thay đổi (không phải trường trống)
    const updatedData = {
      name: name || product.name,
      price: price || product.price,
      images: images || product.images,
      stock: stock || product.stock,
      cpu: cpu || product.cpu,
      screen: screen || product.screen,
      gpu: gpu || product.gpu,
      storage: storage || product.storage,
      screenHz: screenHz || product.screenHz,
      ram: ram || product.ram,
      battery: battery || product.battery,
      camera: camera || product.camera,
      weight: weight || product.weight,
      priceDiscount: priceDiscount || product.priceDiscount,
    };

    // Cập nhật sản phẩm
    const updatedProduct = await modelProduct.findByIdAndUpdate(_id, updatedData, { new: true });

    new OK({
      message: "Chỉnh sửa thông tin sản phẩm thành công",
      metadata: updatedProduct,
    }).send(res);
    
  } catch (error) {
    new BadRequestError({
      message: "Lỗi khi chỉnh sửa thông tin sản phẩm",
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
