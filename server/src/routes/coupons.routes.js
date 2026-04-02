const express = require('express');
const router = express.Router();

const { asyncHandler, authUser, authAdmin } = require('../auth/checkAuth');
const controllerCoupons = require('../controllers/coupons.controller');

router.post('/api/admin/coupons', authAdmin, asyncHandler(controllerCoupons.createCoupon));
router.get('/api/admin/coupons', authAdmin, asyncHandler(controllerCoupons.listCoupons));
router.get('/api/admin/coupons/detail', authAdmin, asyncHandler(controllerCoupons.getCoupon));
router.put('/api/admin/coupons', authAdmin, asyncHandler(controllerCoupons.updateCoupon));
router.patch('/api/admin/coupons/status', authAdmin, asyncHandler(controllerCoupons.updateCouponStatus));
router.delete('/api/admin/coupons', authAdmin, asyncHandler(controllerCoupons.deleteCoupon));

router.post('/api/coupons/validate', authUser, asyncHandler(controllerCoupons.validateCoupon));
router.post('/api/coupons/apply', authUser, asyncHandler(controllerCoupons.applyCoupon));
router.post('/api/coupons/remove', authUser, asyncHandler(controllerCoupons.removeCoupon));
router.get('/api/coupons', asyncHandler(controllerCoupons.getAvailableCoupons));

module.exports = router;
