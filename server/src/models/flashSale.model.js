const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const flashSaleSchema = new Schema(
    {
        product: { type: Schema.Types.ObjectId, ref: 'product', required: true },
        flashSalePrice: { type: Number, required: true },
        quantity: { type: Number, required: true },
        soldQuantity: { type: Number, default: 0 },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('flashSale', flashSaleSchema);
