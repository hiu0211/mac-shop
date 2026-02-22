const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const couponUsageSchema = new Schema(
    {
        couponId: { type: String, required: true, ref: 'coupon' },
        userId: { type: String, required: true, ref: 'user' },
        orderId: { type: String, default: null, ref: 'payments' },
        usedAt: { type: Date, default: Date.now },
        discountAmount: { type: Number, default: 0 },
    },
    {
        timestamps: true,
    },
);

couponUsageSchema.index({ couponId: 1, userId: 1 });

module.exports = mongoose.model('coupon_usage', couponUsageSchema);
