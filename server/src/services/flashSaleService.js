const modelFlashSale = require('../models/flashSale.model');

const getActiveFlashSaleForProduct = async (productId) => {
    const now = new Date();
    const flashSale = await modelFlashSale.findOne({
        product: productId,
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
        $expr: { $lt: ["$soldQuantity", "$quantity"] }
    });
    return flashSale;
};

const incrementFlashSaleSoldQuantity = async (productId, quantityToInc) => {
    const now = new Date();
    const flashSale = await modelFlashSale.findOne({
        product: productId,
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now }
    });
    if (flashSale) {
        flashSale.soldQuantity = (flashSale.soldQuantity || 0) + quantityToInc;
        await flashSale.save();
    }
};

const decrementFlashSaleSoldQuantity = async (productId, quantityToDec) => {
    const flashSale = await modelFlashSale.findOne({
        product: productId
    }).sort({ updatedAt: -1 });

    if (flashSale) {
        flashSale.soldQuantity = Math.max(0, (flashSale.soldQuantity || 0) - quantityToDec);
        await flashSale.save();
    }
};

module.exports = {
    getActiveFlashSaleForProduct,
    incrementFlashSaleSoldQuantity,
    decrementFlashSaleSoldQuantity
};
