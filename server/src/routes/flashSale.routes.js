const express = require('express');
const router = express.Router();

const { asyncHandler, authUser, authAdmin } = require('../auth/checkAuth');
const controllerFlashSale = require('../controllers/flashSale.controller');

router.post('/api/admin/flash-sales', authAdmin, asyncHandler(controllerFlashSale.createFlashSale));
router.get('/api/admin/flash-sales', authAdmin, asyncHandler(controllerFlashSale.getFlashSales));
router.put('/api/admin/flash-sales', authAdmin, asyncHandler(controllerFlashSale.updateFlashSale));
router.delete('/api/admin/flash-sales', authAdmin, asyncHandler(controllerFlashSale.deleteFlashSale));

router.get('/api/flash-sales/active', asyncHandler(controllerFlashSale.getActiveFlashSales));

module.exports = router;
