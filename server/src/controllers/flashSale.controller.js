const modelFlashSale = require('../models/flashSale.model');
const modelProduct = require('../models/products.model');
const { BadRequestError } = require('../core/error.response');
const { OK, Created } = require('../core/success.response');

class FlashSaleController {
    async createFlashSale(req, res) {
        const {
            productId,
            flashSalePrice,
            quantity,
            startDate,
            endDate,
            isActive = true
        } = req.body;

        if (!productId || !flashSalePrice || !quantity || !startDate || !endDate) {
            throw new BadRequestError('Vui lòng điền đầy đủ thông tin');
        }

        const product = await modelProduct.findById(productId);
        if (!product) {
            throw new BadRequestError('Không tìm thấy sản phẩm');
        }

        if (Number(flashSalePrice) <= 0) {
            throw new BadRequestError('Giá khuyến mãi phải lớn hơn 0');
        }

        if (Number(quantity) <= 0) {
            throw new BadRequestError('Số lượng bán phải lớn hơn 0');
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start >= end) {
            throw new BadRequestError('Thời gian bắt đầu phải trước thời gian kết thúc');
        }

        // Check if there is an overlapping active flash sale for this product
        const overlapping = await modelFlashSale.findOne({
            product: productId,
            isActive: true,
            $or: [
                { startDate: { $lte: end }, endDate: { $gte: start } }
            ]
        });

        if (overlapping) {
            throw new BadRequestError('Đã có Flash Sale khác hoạt động cho sản phẩm này trong khoảng thời gian đã chọn');
        }

        const flashSale = await modelFlashSale.create({
            product: productId,
            flashSalePrice: Number(flashSalePrice),
            quantity: Number(quantity),
            soldQuantity: 0,
            startDate: start,
            endDate: end,
            isActive
        });

        new Created({ message: 'Tạo Flash Sale thành công', metadata: flashSale }).send(res);
    }

    async getFlashSales(req, res) {
        const flashSales = await modelFlashSale.find()
            .populate('product')
            .sort({ createdAt: -1 });
        new OK({ message: 'Thành công', metadata: flashSales }).send(res);
    }

    async getActiveFlashSales(req, res) {
        const now = new Date();
        const activeFlashSales = await modelFlashSale.find({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
            $expr: { $lt: ["$soldQuantity", "$quantity"] }
        })
        .populate('product')
        .sort({ endDate: 1 }); // Soonest ending first

        new OK({ message: 'Thành công', metadata: activeFlashSales }).send(res);
    }

    async updateFlashSale(req, res) {
        const { id, productId, flashSalePrice, quantity, startDate, endDate, isActive, soldQuantity } = req.body;
        if (!id) {
            throw new BadRequestError('Thiếu ID Flash Sale');
        }

        const flashSale = await modelFlashSale.findById(id);
        if (!flashSale) {
            throw new BadRequestError('Không tìm thấy Flash Sale');
        }

        const payload = {};
        if (productId) {
            const product = await modelProduct.findById(productId);
            if (!product) {
                throw new BadRequestError('Không tìm thấy sản phẩm');
            }
            payload.product = productId;
        }

        if (flashSalePrice !== undefined) {
            if (Number(flashSalePrice) <= 0) {
                throw new BadRequestError('Giá khuyến mãi phải lớn hơn 0');
            }
            payload.flashSalePrice = Number(flashSalePrice);
        }

        if (quantity !== undefined) {
            if (Number(quantity) <= 0) {
                throw new BadRequestError('Số lượng bán phải lớn hơn 0');
            }
            payload.quantity = Number(quantity);
        }

        if (soldQuantity !== undefined) {
            payload.soldQuantity = Number(soldQuantity);
        }

        if (isActive !== undefined) {
            payload.isActive = isActive;
        }

        if (startDate || endDate) {
            const start = startDate ? new Date(startDate) : new Date(flashSale.startDate);
            const end = endDate ? new Date(endDate) : new Date(flashSale.endDate);
            if (start >= end) {
                throw new BadRequestError('Thời gian bắt đầu phải trước thời gian kết thúc');
            }
            payload.startDate = start;
            payload.endDate = end;

            // Check overlap
            const overlapping = await modelFlashSale.findOne({
                _id: { $ne: id },
                product: productId || flashSale.product,
                isActive: true,
                $or: [
                    { startDate: { $lte: end }, endDate: { $gte: start } }
                ]
            });
            if (overlapping && (isActive !== false)) {
                throw new BadRequestError('Đã có Flash Sale khác hoạt động cho sản phẩm này trong khoảng thời gian đã chọn');
            }
        }

        const updated = await modelFlashSale.findByIdAndUpdate(id, payload, { new: true }).populate('product');
        new OK({ message: 'Cập nhật thành công', metadata: updated }).send(res);
    }

    async deleteFlashSale(req, res) {
        const { id } = req.query;
        if (!id) {
            throw new BadRequestError('Thiếu ID Flash Sale');
        }
        const flashSale = await modelFlashSale.findByIdAndDelete(id);
        if (!flashSale) {
            throw new BadRequestError('Không tìm thấy Flash Sale');
        }
        new OK({ message: 'Xóa Flash Sale thành công', metadata: flashSale }).send(res);
    }
}

module.exports = new FlashSaleController();
