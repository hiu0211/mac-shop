const crypto = require('crypto');
const { BadUserRequestError, BadUser2RequestError } = require('../core/error.response');
const { verifyToken } = require('../services/tokenSevices');
const modelUser = require('../models/users.model');

const asyncHandler = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

const getCookieConfig = (req, maxAge, httpOnly = false) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const config = {
        httpOnly,
        secure: isProduction,
        sameSite: isProduction ? 'None' : 'Lax',
    };
    if (typeof maxAge === 'number') {
        config.maxAge = maxAge;
    }
    return config;
};

const authUser = async (req, res, next) => {
    try {
        const token = req.cookies?.token;
        if (token) {
            try {
                const decoded = await verifyToken(token);
                const findUser = await modelUser.findById(decoded.id).select('isActive');
                if (findUser) {
                    if (!findUser.isActive) {
                        throw new BadUser2RequestError('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên');
                    }
                    req.user = decoded;
                    req.isGuest = false;
                    return next();
                }
            } catch (err) {
                if (err instanceof BadUser2RequestError) throw err;
                // If token invalid/expired, fall back to guest session
            }
        }

        // Guest session handling
        let guestId = req.cookies?.guestId || req.headers['x-guest-id'];
        if (!guestId) {
            guestId = 'guest_' + crypto.randomBytes(12).toString('hex');
        }

        res.cookie('guestId', guestId, getCookieConfig(req, 30 * 24 * 60 * 60 * 1000, false));

        req.user = { id: guestId, isGuest: true };
        req.isGuest = true;
        next();
    } catch (error) {
        next(error);
    }
};

const requireRegisteredUser = async (req, res, next) => {
    if (!req.user) {
        return authUser(req, res, (err) => {
            if (err) return next(err);
            if (!req.user || req.isGuest) {
                return next(new BadUserRequestError('Vui lòng đăng nhập'));
            }
            next();
        });
    }
    if (req.isGuest) {
        return next(new BadUserRequestError('Vui lòng đăng nhập'));
    }
    next();
};

const authAdmin = async (req, res, next) => {
    try {
        const user = req.cookies?.token;
        if (!user) throw new BadUserRequestError('Bạn không có quyền truy cập');
        const token = user;
        const decoded = await verifyToken(token);
        const { id } = decoded;
        const findUser = await modelUser.findById(id).select('isAdmin isActive');
        if (!findUser) {
            throw new BadUserRequestError('Vui lòng đăng nhập');
        }
        if (!findUser.isActive) {
            throw new BadUser2RequestError('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên');
        }
        if (findUser.isAdmin === false) {
            throw new BadUser2RequestError('Bạn không có quyền truy cập');
        }
        req.user = decoded;
        req.isGuest = false;
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    asyncHandler,
    authUser,
    requireRegisteredUser,
    authAdmin,
};

