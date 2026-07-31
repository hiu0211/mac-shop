const express = require('express');
const router = express.Router();

const { asyncHandler, requireRegisteredUser } = require('../auth/checkAuth');
const controllerWishlist = require('../controllers/wishlist.controller');

router.get('/api/wishlist', requireRegisteredUser, asyncHandler(controllerWishlist.getWishlist));
router.post('/api/wishlist/add', requireRegisteredUser, asyncHandler(controllerWishlist.addWishlist));
router.delete('/api/wishlist/remove', requireRegisteredUser, asyncHandler(controllerWishlist.removeWishlist));

module.exports = router;

