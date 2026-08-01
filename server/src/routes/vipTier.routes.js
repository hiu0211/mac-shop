const express = require('express');
const router = express.Router();

const { asyncHandler, authAdmin } = require('../auth/checkAuth');
const vipTierController = require('../controllers/vipTier.controller');

// Public route to get VIP tiers
router.get('/api/vip-tiers', asyncHandler(vipTierController.getVipTiers));

// Admin routes for VIP tier management
router.get('/api/admin/vip-tiers', authAdmin, asyncHandler(vipTierController.getVipTiers));
router.post('/api/admin/vip-tiers', authAdmin, asyncHandler(vipTierController.createVipTier));
router.put('/api/admin/vip-tiers/:id', authAdmin, asyncHandler(vipTierController.updateVipTier));
router.delete('/api/admin/vip-tiers/:id', authAdmin, asyncHandler(vipTierController.deleteVipTier));

module.exports = router;
