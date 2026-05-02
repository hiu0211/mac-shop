const modelUser = require('../models/users.model');
const modelProduct = require('../models/products.model');
const mongoose = require('mongoose');
const { BadRequestError } = require('../core/error.response');
const { OK } = require('../core/success.response');

class controllerWishlist {
  async getWishlist(req, res) {
    const { id } = req.user;
    const user = await modelUser.findById(id).select('wishlist');
    const list = (user && Array.isArray(user.wishlist)) ? user.wishlist.map(String) : [];
    new OK({ message: 'Thành công', metadata: list }).send(res);
  }

  async addWishlist(req, res) {
    const { productId } = req.body;
    const { id } = req.user;

    const normalizedProductId = String(productId || '').trim();
    if (!normalizedProductId || !mongoose.Types.ObjectId.isValid(normalizedProductId)) {
      throw new BadRequestError('Mã sản phẩm không hợp lệ');
    }

    const product = await modelProduct.findById(normalizedProductId);
    if (!product) {
      throw new BadRequestError('Không tìm thấy sản phẩm');
    }

    const user = await modelUser.findById(id);
    if (!user) {
      throw new BadRequestError('Không tìm thấy người dùng');
    }

    user.wishlist = user.wishlist || [];
    const exists = user.wishlist.some((p) => String(p) === normalizedProductId);
    if (!exists) {
      user.wishlist.push(normalizedProductId);
      await user.save();
    }

    const result = user.wishlist.map(String);
    new OK({ message: 'Đã thêm vào danh sách yêu thích', metadata: result }).send(res);
  }

  async removeWishlist(req, res) {
    const { productId } = req.query;
    const { id } = req.user;

    const normalizedProductId = String(productId || '').trim();
    if (!normalizedProductId || !mongoose.Types.ObjectId.isValid(normalizedProductId)) {
      throw new BadRequestError('Mã sản phẩm không hợp lệ');
    }

    const user = await modelUser.findById(id);
    if (!user) {
      throw new BadRequestError('Không tìm thấy người dùng');
    }

    user.wishlist = (user.wishlist || []).filter((p) => String(p) !== normalizedProductId);
    await user.save();

    const result = user.wishlist.map(String);
    new OK({ message: 'Đã bỏ khỏi danh sách yêu thích', metadata: result }).send(res);
  }
}

module.exports = new controllerWishlist();
