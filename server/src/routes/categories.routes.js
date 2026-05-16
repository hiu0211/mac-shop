const express = require('express');
const router = express.Router();

const { asyncHandler, authAdmin } = require('../auth/checkAuth');
const controller = require('../controllers/categories.controller');

router.get('/api/categories', asyncHandler(controller.getAllActive));

router.post('/api/admin/categories', authAdmin, asyncHandler(controller.create));
router.get('/api/admin/categories', authAdmin, asyncHandler(controller.getAll));
router.get('/api/admin/categories/all-active', authAdmin, asyncHandler(controller.getAllActive));
router.get('/api/admin/categories/:id', authAdmin, asyncHandler(controller.getById));
router.put('/api/admin/categories/:id', authAdmin, asyncHandler(controller.update));
router.delete('/api/admin/categories/:id', authAdmin, asyncHandler(controller.delete));

module.exports = router;
