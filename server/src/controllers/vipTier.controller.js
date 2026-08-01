const { BadRequestError } = require("../core/error.response");
const { OK, Created } = require("../core/success.response");
const vipTierService = require("../services/vipTierService");

class VipTierController {
  async getVipTiers(req, res) {
    const tiers = await vipTierService.getAllVipTiers();
    new OK({
      message: "Lấy danh sách bậc hạng thành công",
      metadata: tiers,
    }).send(res);
  }

  async createVipTier(req, res) {
    const { name, minSpending, discountRate, color } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      throw new BadRequestError("Vui lòng nhập tên bậc hạng");
    }

    try {
      const newTier = await vipTierService.createVipTier({
        name,
        minSpending,
        discountRate,
        color,
      });

      new Created({
        message: "Thêm bậc hạng thành công",
        metadata: newTier,
      }).send(res);
    } catch (error) {
      throw new BadRequestError(error.message || "Thêm bậc hạng thất bại");
    }
  }

  async updateVipTier(req, res) {
    const { id } = req.params;
    const { name, minSpending, discountRate, color } = req.body;

    if (!id) {
      throw new BadRequestError("Thiếu ID bậc hạng");
    }

    try {
      const updatedTier = await vipTierService.updateVipTier(id, {
        name,
        minSpending,
        discountRate,
        color,
      });

      new OK({
        message: "Cập nhật bậc hạng thành công",
        metadata: updatedTier,
      }).send(res);
    } catch (error) {
      throw new BadRequestError(error.message || "Cập nhật bậc hạng thất bại");
    }
  }

  async deleteVipTier(req, res) {
    const { id } = req.params;

    if (!id) {
      throw new BadRequestError("Thiếu ID bậc hạng");
    }

    try {
      await vipTierService.deleteVipTier(id);

      new OK({
        message: "Xóa bậc hạng thành công",
      }).send(res);
    } catch (error) {
      throw new BadRequestError(error.message || "Xóa bậc hạng thất bại");
    }
  }
}

module.exports = new VipTierController();
