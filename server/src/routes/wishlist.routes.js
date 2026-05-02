const express = require('express');
const router = express.Router();

const { asyncHandler, authUser } = require('../auth/checkAuth');
const controllerWishlist = require('../controllers/wishlist.controller');

router.get('/api/wishlist', authUser, asyncHandler(controllerWishlist.getWishlist));
router.post('/api/wishlist/add', authUser, asyncHandler(controllerWishlist.addWishlist));
router.delete('/api/wishlist/remove', authUser, asyncHandler(controllerWishlist.removeWishlist));

module.exports = router;
