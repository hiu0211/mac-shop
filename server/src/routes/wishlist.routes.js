const express = require('express');
const router = express.Router();

const { asyncHandler, authUser, requireRegisteredUser } = require('../auth/checkAuth');
const controllerWishlist = require('../controllers/wishlist.controller');

router.get('/api/wishlist', authUser, requireRegisteredUser, asyncHandler(controllerWishlist.getWishlist));
router.post('/api/wishlist/add', authUser, requireRegisteredUser, asyncHandler(controllerWishlist.addWishlist));
router.delete('/api/wishlist/remove', authUser, requireRegisteredUser, asyncHandler(controllerWishlist.removeWishlist));

module.exports = router;

