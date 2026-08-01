const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const vipTierSchema = new Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        minSpending: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        discountRate: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
            default: 0,
        },
        color: {
            type: String,
            default: '#8c8c8c',
        },
        orderIndex: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('vipTier', vipTierSchema);
