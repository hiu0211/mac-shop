const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const modelPayments = new Schema(
    {
        userId: { type: String, require: true, ref: 'user' },
        products: {
            type: [
                {
                    _id: false,
                    productId: { type: String, required: true, ref: 'product' },
                    quantity: { type: Number, required: true, min: 1 },
                    selectedColorKey: { type: String, default: '', trim: true, lowercase: true },
                    selectedColorName: { type: String, default: '', trim: true },
                    selectedColorHex: { type: String, default: '', trim: true },
                    selectedColorImage: { type: String, default: '', trim: true },
                    unitPrice: { type: Number, default: 0, min: 0 },
                },
            ],
            default: [],
            require: true,
            ref: 'cart',
        },
        fullName: { type: String, require: true },
        phone: { type: Number, require: true },
        address: { type: String, require: true },
        email: { type: String, default: '', trim: true },
        typePayments: { type: String, enum: ['COD', 'MOMO', 'VNPAY'], default: 'COD', require: true },
        statusOrder: {
            type: String,
            enum: ['pending', 'completed', 'shipping', 'delivered', 'cancelled'],
            default: 'pending',
            require: true,
        },
        totalPrice: { type: Number, require: true },
        totalPriceBeforeDiscount: { type: Number, default: 0 },
        discountAmount: { type: Number, default: 0 },
        couponId: { type: String, default: null, ref: 'coupon' },
        couponCode: { type: String, default: '' },
        productReviews: {
            type: [
                {
                    productId: { type: String, required: true, ref: 'product' },
                    rating: { type: Number, required: true, min: 1, max: 5 },
                    comment: { type: String, default: '' },
                    images: { type: [String], default: [] },
                    createdAt: { type: Date, default: Date.now },
                },
            ],
            default: [],
        },
        contactMessages: {
            type: [
                {
                    senderType: { type: String, enum: ['user', 'admin'], required: true },
                    senderId: { type: String, required: true, ref: 'user' },
                    senderName: { type: String, default: '' },
                    message: { type: String, required: true },
                    createdAt: { type: Date, default: Date.now },
                },
            ],
            default: [],
        },
        tierCounted: { type: Boolean, default: false },
        vipTierAtOrder: {
            type: String,
            default: 'none',
        },
        vipDiscountRate: { type: Number, default: 0 },
        vipDiscountAmount: { type: Number, default: 0 },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('payments', modelPayments);
