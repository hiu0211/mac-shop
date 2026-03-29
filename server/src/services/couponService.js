const modelCoupon = require('../models/coupon.model');
const modelCouponUsage = require('../models/couponUsage.model');
const { BadRequestError } = require('../core/error.response');

const normalizeCode = (code) => (code || '').trim().toUpperCase();

const computeDiscount = ({ type, value, cartTotal, maxDiscount }) => {
    if (cartTotal <= 0) {
        return { discount: 0, finalTotal: 0 };
    }

    let discount = 0;
    if (type === 'PERCENT') {
        discount = Math.floor(cartTotal * (value / 100));
        if (maxDiscount && maxDiscount > 0) {
            discount = Math.min(discount, maxDiscount);
        }
    } else {
        discount = value;
    }

    if (discount < 0) {
        discount = 0;
    }

    if (discount > cartTotal) {
        discount = cartTotal;
    }

    return { discount, finalTotal: Math.max(cartTotal - discount, 0) };
};

const validateCouponForCart = async ({ couponCode, userId, cartTotal }) => {
    const code = normalizeCode(couponCode);
    if (!code) {
        throw new BadRequestError('Vui lòng nhập mã giảm giá');
    }

    const coupon = await modelCoupon.findOne({ code });
    if (!coupon) {
        throw new BadRequestError('Mã giảm giá không tồn tại');
    }

    if (coupon.status !== 'ACTIVE') {
        throw new BadRequestError('Mã giảm giá đang bị vô hiệu hóa');
    }

    const now = new Date();
    if (now > coupon.endAt) {
        await modelCoupon.updateOne({ _id: coupon._id }, { $set: { status: 'INACTIVE' } });
        throw new BadRequestError('Mã giảm giá đã hết hạn');
    }

    if (now < coupon.startAt) {
        throw new BadRequestError('Mã giảm giá chưa đến thời gian áp dụng');
    }

    if (coupon.minOrderValue && cartTotal < coupon.minOrderValue) {
        throw new BadRequestError('Đơn hàng chưa đạt giá trị tối thiểu');
    }

    if (coupon.totalUsageLimit && coupon.totalUsageLimit > 0 && coupon.usedCount >= coupon.totalUsageLimit) {
        throw new BadRequestError('Mã giảm giá đã hết lượt sử dụng');
    }

    if (coupon.perUserUsageLimit && coupon.perUserUsageLimit > 0) {
        const usageCount = await modelCouponUsage.countDocuments({
            couponId: coupon._id.toString(),
            userId: userId.toString(),
        });
        if (usageCount >= coupon.perUserUsageLimit) {
            throw new BadRequestError('Bạn đã dùng mã này tối đa số lần cho phép');
        }
    }

    const { discount, finalTotal } = computeDiscount({
        type: coupon.type,
        value: coupon.value,
        cartTotal,
        maxDiscount: coupon.maxDiscount,
    });

    if (discount <= 0) {
        throw new BadRequestError('Mã giảm giá không áp dụng được');
    }

    return { coupon, discount, finalTotal };
};

const recalculateCartTotals = async ({ cart, userId }) => {
    if (!cart) {
        return { applied: false };
    }

    if (!cart.couponCode) {
        cart.discountAmount = 0;
        cart.totalPriceAfterDiscount = cart.totalPrice;
        return { applied: false };
    }

    try {
        const { coupon, discount, finalTotal } = await validateCouponForCart({
            couponCode: cart.couponCode,
            userId,
            cartTotal: cart.totalPrice,
        });

        cart.couponId = coupon._id.toString();
        cart.couponCode = coupon.code;
        cart.discountAmount = discount;
        cart.totalPriceAfterDiscount = finalTotal;
        return { applied: true };
    } catch (error) {
        cart.couponId = null;
        cart.couponCode = '';
        cart.discountAmount = 0;
        cart.totalPriceAfterDiscount = cart.totalPrice;
        return { applied: false, error };
    }
};

    const recordCouponUsage = async ({ couponId, userId, orderId, discountAmount }) => {
        if (!couponId) {
            return;
        }
        await modelCouponUsage.create({
            couponId: couponId.toString(),
            userId: userId.toString(),
            orderId: orderId ? orderId.toString() : null,
            discountAmount,
        });
        await modelCoupon.updateOne({ _id: couponId }, { $inc: { usedCount: 1 } });
    };

module.exports = {
    normalizeCode,
    validateCouponForCart,
    computeDiscount,
    recalculateCartTotals,
    recordCouponUsage,
};
