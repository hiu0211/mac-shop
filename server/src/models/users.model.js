const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const modelUser = new Schema(
    {
        fullName: { type: String, require: true },
        email: { type: String, require: true },
        password: { type: String, require: true },
        phone: { type: String, require: true },
        isAdmin: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
        wishlist: { type: [{ type: Schema.Types.ObjectId, ref: 'product' }], default: [] },
        typeLogin: { type: String, enum: ['email', 'google'] },
        vipTier: {
            type: String,
            enum: ['none', 'dong', 'bac', 'vang', 'kimcuong'],
            default: 'none',
        },
        yearlySpending: { type: Number, default: 0, min: 0 },
        spendingYear: { type: Number, default: () => new Date().getFullYear() },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('user', modelUser);
