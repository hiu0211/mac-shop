const modelCoupon = require('../models/coupon.model');
const modelCouponUsage = require('../models/couponUsage.model');
const modelCart = require('../models/cart.model');
const { BadRequestError, ConflictRequestError } = require('../core/error.response');
const { OK, Created } = require('../core/success.response');
const { normalizeCode, validateCouponForCart } = require('../services/couponService');

class CouponsController {
    async createCoupon(req, res) {
        const {
            code,
            type,
            value,
            minOrderValue = 0,
            maxDiscount = 0,
            totalUsageLimit = 0,
            perUserUsageLimit = 0,
            startAt,
            endAt,
            status = 'ACTIVE',
        } = req.body;

        const normalizedCode = normalizeCode(code);
        if (!normalizedCode) {
            throw new BadRequestError('Vui lòng nhập mã giảm giá');
        }
        if (!type || !['PERCENT', 'FIXED'].includes(type)) {
            throw new BadRequestError('Loại giảm giá không hợp lệ');
        }
        if (!value || value <= 0) {
            throw new BadRequestError('Giá trị giảm không hợp lệ');
        }
        if (!startAt || !endAt) {
            throw new BadRequestError('Vui lòng chọn thời gian áp dụng');
        }
        if (new Date(startAt) > new Date(endAt)) {
            throw new BadRequestError('Ngày bắt đầu phải trước ngày kết thúc');
        }

        const existing = await modelCoupon.findOne({ code: normalizedCode });
        if (existing) {
            throw new ConflictRequestError('Mã giảm giá đã tồn tại');
        }

        const newCoupon = await modelCoupon.create({
            code: normalizedCode,
            type,
            value,
            minOrderValue,
            maxDiscount,
            totalUsageLimit,
            perUserUsageLimit,
            startAt,
            endAt,
            status,
        });

        new Created({ message: 'Tạo mã giảm giá thành công', metadata: newCoupon }).send(res);
    }

    async listCoupons(req, res) {
        const { code, status } = req.query;
        const query = {};
        if (code) {
            query.code = normalizeCode(code);
        }
        if (status) {
            query.status = status;
        }

        const coupons = await modelCoupon.find(query).sort({ createdAt: -1 });
        new OK({ message: 'Thành công', metadata: coupons }).send(res);
    }

    async getCoupon(req, res) {
        const { id } = req.query;
        if (!id) {
            throw new BadRequestError('Không tìm thấy mã giảm giá');
        }
        const coupon = await modelCoupon.findById(id);
        if (!coupon) {
            throw new BadRequestError('Không tìm thấy mã giảm giá');
        }
        new OK({ message: 'Thành công', metadata: coupon }).send(res);
    }

    async updateCoupon(req, res) {
        const { id, ...payload } = req.body;
        if (!id) {
            throw new BadRequestError('Không tìm thấy mã giảm giá');
        }

        if (payload.code) {
            payload.code = normalizeCode(payload.code);
            const existing = await modelCoupon.findOne({
                code: payload.code,
                _id: { $ne: id },
            });
            if (existing) {
                throw new ConflictRequestError('Mã giảm giá đã tồn tại');
            }
        }

        if (payload.startAt && payload.endAt && new Date(payload.startAt) > new Date(payload.endAt)) {
            throw new BadRequestError('Ngày bắt đầu phải trước ngày kết thúc');
        }

        const coupon = await modelCoupon.findByIdAndUpdate(id, payload, { new: true });
        if (!coupon) {
            throw new BadRequestError('Không tìm thấy mã giảm giá');
        }
        new OK({ message: 'Cập nhật thành công', metadata: coupon }).send(res);
    }

    async updateCouponStatus(req, res) {
        const { id, status } = req.body;
        if (!id || !status) {
            throw new BadRequestError('Thiếu thông tin cập nhật');
        }
        const coupon = await modelCoupon.findByIdAndUpdate(id, { status }, { new: true });
        if (!coupon) {
            throw new BadRequestError('Không tìm thấy mã giảm giá');
        }
        new OK({ message: 'Cập nhật trạng thái thành công', metadata: coupon }).send(res);
    }

    async deleteCoupon(req, res) {
        const { id } = req.query;
        if (!id) {
            throw new BadRequestError('Không tìm thấy mã giảm giá');
        }
        const coupon = await modelCoupon.findByIdAndDelete(id);
        if (!coupon) {
            throw new BadRequestError('Không tìm thấy mã giảm giá');
        }
        new OK({ message: 'Xóa mã giảm giá thành công', metadata: coupon }).send(res);
    }

    async validateCoupon(req, res) {
        const { id } = req.user;
        const { code } = req.body;
        const cart = await modelCart.findOne({ userId: id });
        if (!cart) {
            throw new BadRequestError('Không tìm thấy giỏ hàng');
        }

        const { coupon, discount, finalTotal } = await validateCouponForCart({
            couponCode: code,
            userId: id,
            cartTotal: cart.totalPrice,
        });

        new OK({
            message: 'Mã giảm giá hợp lệ',
            metadata: {
                couponId: coupon._id,
                code: coupon.code,
                discountAmount: discount,
                totalPriceAfterDiscount: finalTotal,
                totalPriceBeforeDiscount: cart.totalPrice,
            },
        }).send(res);
    }

    async applyCoupon(req, res) {
        const { id } = req.user;
        const { code } = req.body;
        const cart = await modelCart.findOne({ userId: id });
        if (!cart) {
            throw new BadRequestError('Không tìm thấy giỏ hàng');
        }

        const { coupon, discount, finalTotal } = await validateCouponForCart({
            couponCode: code,
            userId: id,
            cartTotal: cart.totalPrice,
        });

        cart.couponId = coupon._id.toString();
        cart.couponCode = coupon.code;
        cart.discountAmount = discount;
        cart.totalPriceAfterDiscount = finalTotal;
        await cart.save();

        new OK({
            message: 'Áp dụng mã giảm giá thành công',
            metadata: {
                couponId: coupon._id,
                code: coupon.code,
                discountAmount: discount,
                totalPriceAfterDiscount: finalTotal,
                totalPriceBeforeDiscount: cart.totalPrice,
            },
        }).send(res);
    }

    async removeCoupon(req, res) {
        const { id } = req.user;
        const cart = await modelCart.findOne({ userId: id });
        if (!cart) {
            throw new BadRequestError('Không tìm thấy giỏ hàng');
        }

        cart.couponId = null;
        cart.couponCode = '';
        cart.discountAmount = 0;
        cart.totalPriceAfterDiscount = cart.totalPrice;
        await cart.save();

        new OK({ message: 'Đã hủy mã giảm giá', metadata: cart }).send(res);
    }

    async recordCouponUsage({ couponId, userId, orderId, discountAmount }) {
        if (!couponId) return;
        await modelCouponUsage.create({
            couponId: couponId.toString(),
            userId: userId.toString(),
            orderId: orderId ? orderId.toString() : null,
            discountAmount,
        });
        await modelCoupon.updateOne({ _id: couponId }, { $inc: { usedCount: 1 } });
    }
}

module.exports = new CouponsController();
