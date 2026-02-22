const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const couponSchema = new Schema(
    {
        code: { type: String, required: true, unique: true, uppercase: true, trim: true },
        type: { type: String, enum: ['PERCENT', 'FIXED'], required: true },
        value: { type: Number, required: true },
        minOrderValue: { type: Number, default: 0 },
        maxDiscount: { type: Number, default: 0 },
        totalUsageLimit: { type: Number, default: 0 },
        perUserUsageLimit: { type: Number, default: 0 },
        usedCount: { type: Number, default: 0 },
        startAt: { type: Date, required: true },
        endAt: { type: Date, required: true },
        status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    },
    {
        timestamps: true,
    },
);

couponSchema.index({ code: 1 }, { unique: true });

module.exports = mongoose.model('coupon', couponSchema);
