import axios from 'axios';

import cookies from 'js-cookie';

const request = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
});

export const requestAdmin = async () => {
    const res = await request.get('/api/admin/auth');
    return res.data;
};

export const requestAdminLogin = async (data) => {
    const res = await request.post('/api/admin/login', data);
    return res.data;
};

export const requestAskQuestion = async (data) => {
    const res = await request.post('/chat', data);
    return res.data;
};

export const requestRegister = async (data) => {
    const res = await request.post('/api/register', data);
    return res.data;
};

export const requestLogin = async (data) => {
    const res = await request.post('/api/login', data);
    return res.data;
};

export const requestAuth = async () => {
    const res = await request.get('/api/auth');
    return res.data;
};

export const requestLogout = async () => {
    const res = await request.get('/api/logout');
    return res.data;
};

export const requestRefreshToken = async () => {
    const res = await request.get('/api/refresh-token');
    return res.data;
};

export const requestUploadImage = async (data) => {
    const res = await request.post('/api/upload-image', data);
    return res.data;
};

export const requestGetAdminStats = async () => {
    const res = await request.get('/api/get-admin-stats');
    return res.data;
};

export const requestGetRevenueStatistics = async (params) => {
    const res = await request.get('/api/revenue/statistics', { params });
    return res.data;
};

export const requestGetAllUser = async () => {
    const res = await request.get('/api/get-all-users');
    return res.data;
};

export const requestCreateUser = async (data) => {
    const res = await request.post('/api/admin/create-user', data);
    return res.data;
};

export const requestUpdateUserRole = async (data) => {
    const res = await request.patch('/api/update-user-role', data);
    return res.data;
};

export const requestUpdateUserStatus = async (data) => {
    const res = await request.patch('/api/update-user-status', data);
    return res.data;
};

export const requestUpdateInfoUser = async (data) => {
    const res = await request.post('/api/update-info-user', data);
    return res.data;
};

export const requestLoginGoogle = async (data) => {
    const res = await request.post('/api/login-google', { credential: data });
    return res.data;
};

export const requestUpdatePassword = async (data) => {
    const res = await request.post('/api/update-password', data);
    return res.data;
};

export const requestAddProduct = async (data) => {
    const res = await request.post('/api/add-product', data);
    return res.data;
};

export const requestUpdateStatusOrder = async (data) => {
    const res = await request.post('/api/update-status-order', data);
    return res.data;
};

export const requestGetAllProduct = async (params = {}) => {
    const res = await request.get('/api/all-product', { params });
    return res.data;
};

export const requestGetBrands = async (params = {}) => {
    const res = await request.get('/api/brands', { params });
    return res.data;
};

export const requestGetAdminBrands = async (params = {}) => {
    const res = await request.get('/api/admin/brands', { params });
    return res.data;
};

export const requestGetAdminCategories = async (params = {}) => {
    const res = await request.get('/api/admin/categories', { params });
    return res.data;
};

export const requestGetAdminCategoryById = async (id) => {
    const res = await request.get(`/api/admin/categories/${id}`);
    return res.data;
};

export const requestCreateCategory = async (data) => {
    const res = await request.post('/api/admin/categories', data);
    return res.data;
};

export const requestUpdateCategory = async (id, data) => {
    const res = await request.put(`/api/admin/categories/${id}`, data);
    return res.data;
};

export const requestDeleteCategory = async (id) => {
    const res = await request.delete(`/api/admin/categories/${id}`);
    return res.data;
};

export const requestGetActiveCategories = async () => {
    const res = await request.get('/api/admin/categories/all-active');
    return res.data;
};

export const requestGetCategories = async () => {
    const res = await request.get('/api/categories');
    return res.data;
};

export const requestCreateBrand = async (data) => {
    const res = await request.post('/api/admin/brands', data);
    return res.data;
};

export const requestUpdateBrand = async (data) => {
    const res = await request.put('/api/admin/brands', data);
    return res.data;
};

export const requestDeleteBrand = async (id) => {
    const res = await request.delete('/api/admin/brands', { params: { id } });
    return res.data;
};

export const requestGetAllProductTypes = async () => {
    const res = await request.get('/api/product-types');
    return res.data;
};

export const requestCreateProductType = async (data) => {
    const res = await request.post('/api/product-types', data);
    return res.data;
};

export const requestUpdateProductType = async (id, data) => {
    const res = await request.put(`/api/product-types/${id}`, data);
    return res.data;
};

export const requestDeleteProductType = async (id) => {
    const res = await request.delete(`/api/product-types/${id}`);
    return res.data;
};

export const requestCheckProductTypeCodeExists = async (code) => {
    const res = await request.get('/api/product-types/check-code', { params: { code } });
    return Boolean(res?.data?.metadata?.exists);
};

export const requestEditProduct = async (data) => {
    const res = await request.post('/api/edit-product', data);
    return res.data;
};

export const requestDeleteProduct = async (id) => {
    const res = await request.delete('/api/delete-product', { params: { id } });
    return res.data;
};

export const requestSearchProduct = async (keyword = '', brand = 'all', page = 1, limit = 12) => {
    const params = { keyword, page, limit };

    if (brand && brand !== 'all') {
        params.brand = brand;
    }

    const res = await request.get('/api/search-product', { params });
    return res.data;
};

export const requestGetProducts = async (limit = 8) => {
    const res = await request.get('/api/products', { params: { limit } });
    return res.data;
};

export const requestGetProductById = async (id) => {
    const res = await request.get(`/api/product`, { params: { id } });
    return res.data;
};

export const requestFilterProduct = async (params = {}) => {
    const res = await request.get('/api/filter-product', { params });
    return res.data;
};

export const requestCompareProduct = async (productId1, productId2) => {
    const res = await request.post('/compare-product', { productId1, productId2 });
    return res.data;
};

export const requestAddToCart = async (data) => {
    const res = await request.post('/api/add-to-cart', data);
    return res.data;
};

export const requestGetCart = async () => {
    const res = await request.get('/api/get-cart');
    return res.data;
};

export const requestGetWishlist = async () => {
    const res = await request.get('/api/wishlist');
    return res.data;
};

export const requestAddWishlist = async (data) => {
    const res = await request.post('/api/wishlist/add', data);
    return res.data;
};

export const requestRemoveWishlist = async (productId) => {
    const res = await request.delete('/api/wishlist/remove', { params: { productId } });
    return res.data;
};

export const requestDeleteCart = async (productId, selectedColorKey = undefined) => {
    const params = { productId: String(productId || '').trim() };
    if (selectedColorKey !== undefined) {
        params.selectedColorKey = selectedColorKey;
    }
    const res = await request.delete('/api/delete-cart', { params });
    return res.data;
};

export const requestUpdateInfoUserCart = async (data) => {
    const res = await request.post('/api/update-info-user-cart', data);
    return res.data;
};

export const requestCheckEmailExists = async (email) => {
    const res = await request.get('/api/check-email-exists', { params: { email } });
    return res.data?.metadata?.exists || false;
};

export const requestPayment = async (typePayment) => {
    const res = await request.post('/api/payment', { typePayment });
    return res.data;
};

export const requestGetHistoryOrder = async () => {
    const res = await request.get('/api/get-history-order');
    return res.data;
};

export const requestGetOnePayment = async (id) => {
    const res = await request.get('/api/get-one-payment', { params: { id } });
    return res.data;
};

export const requestCancelOrder = async (orderId) => {
    const res = await request.post('/api/cancel-order', { orderId });
    return res.data;
};

export const requestReorder = async (orderId) => {
    const res = await request.post('/api/reorder', { orderId });
    return res.data;
};

export const requestGetOrderContactMessages = async (orderId) => {
    const res = await request.get('/api/order-contact', { params: { orderId } });
    return res.data;
};

export const requestSendOrderContactMessage = async (data) => {
    const res = await request.post('/api/order-contact', data);
    return res.data;
};

export const requestReplyOrderContactMessage = async (data) => {
    const res = await request.post('/api/order-contact-reply', data);
    return res.data;
};

export const requestDeleteOrderContactMessage = async (orderId, messageId) => {
    const res = await request.delete('/api/order-contact-message', { params: { orderId, messageId } });
    return res.data;
};

export const requestReviewOrderProduct = async (data) => {
    const res = await request.post('/api/review-order-product', data);
    return res.data;
};

export const requestGetAdminReviews = async () => {
    const res = await request.get('/api/admin/reviews');
    return res.data;
};

export const requestReplyAdminReview = async (data) => {
    const res = await request.post('/api/admin/reviews/reply', data);
    return res.data;
};

export const requestDeleteAdminReview = async (productId, reviewId) => {
    const res = await request.delete('/api/admin/reviews', { params: { productId, reviewId } });
    return res.data;
};

export const requestGetOrderAdmin = async (params = {}) => {
    const res = await request.get('/api/get-order-admin', { params });
    return res.data;
};

export const requestDeleteOrder = async (orderId) => {
    const res = await request.delete('/api/delete-order', { params: { orderId } });
    return res.data;
};

export const requestUpdateQuantityCart = async (productId, quantity, selectedColorKey = undefined) => {
    const payload = {
        productId: String(productId || '').trim(),
        quantity
    };

    if (selectedColorKey !== undefined) {
        payload.selectedColorKey = selectedColorKey;
    }

    const res = await request.put('/api/update-quantity-cart', payload);
    return res.data;
};

export const requestGetCoupons = async () => {
    const res = await request.get('/api/admin/coupons');
    return res.data;
};

export const requestCreateCoupon = async (data) => {
    const res = await request.post('/api/admin/coupons', data);
    return res.data;
};

export const requestUpdateCoupon = async (data) => {
    const res = await request.put('/api/admin/coupons', data);
    return res.data;
};

export const requestUpdateCouponStatus = async (data) => {
    const res = await request.patch('/api/admin/coupons/status', data);
    return res.data;
};

export const requestDeleteCoupon = async (id) => {
    const res = await request.delete('/api/admin/coupons', { params: { id } });
    return res.data;
};

export const requestValidateCoupon = async (code) => {
    const res = await request.post('/api/coupons/validate', { code });
    return res.data;
};

export const requestApplyCoupon = async (code) => {
    const res = await request.post('/api/coupons/apply', { code });
    return res.data;
};

export const requestRemoveCoupon = async () => {
    const res = await request.post('/api/coupons/remove');
    return res.data;
};

export const requestGetAvailableCoupons = async () => {
    const res = await request.get('/api/coupons');
    return res.data;
};

export const requestGetFlashSales = async () => {
    const res = await request.get('/api/admin/flash-sales');
    return res.data;
};

export const requestCreateFlashSale = async (data) => {
    const res = await request.post('/api/admin/flash-sales', data);
    return res.data;
};

export const requestUpdateFlashSale = async (data) => {
    const res = await request.put('/api/admin/flash-sales', data);
    return res.data;
};

export const requestDeleteFlashSale = async (id) => {
    const res = await request.delete('/api/admin/flash-sales', { params: { id } });
    return res.data;
};

export const requestGetActiveFlashSales = async () => {
    const res = await request.get('/api/flash-sales/active');
    return res.data;
};

export const requestCreateUserFromOrder = async (orderId) => {
    const res = await request.post('/api/create-user-from-order', { orderId });
    return res.data;
};

export const requestGetVipTiers = async () => {
    const res = await request.get('/api/vip-tiers');
    return res.data;
};

export const requestGetAdminVipTiers = async () => {
    const res = await request.get('/api/admin/vip-tiers');
    return res.data;
};

export const requestCreateVipTier = async (data) => {
    const res = await request.post('/api/admin/vip-tiers', data);
    return res.data;
};

export const requestUpdateVipTier = async (id, data) => {
    const res = await request.put(`/api/admin/vip-tiers/${id}`, data);
    return res.data;
};

export const requestDeleteVipTier = async (id) => {
    const res = await request.delete(`/api/admin/vip-tiers/${id}`);
    return res.data;
};

let isRefreshing = false;
let failedRequestsQueue = [];

request.interceptors.response.use(
    (response) => response, // Trả về nếu không có lỗi
    async (error) => {
        const originalRequest = error.config;

        // Nếu lỗi 401 (Unauthorized) và request chưa từng thử refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // Nếu không có refresh token -> logout ngay và reject để không treo UI
            const token = cookies.get('logged');
            if (!token) {
                failedRequestsQueue.forEach((req) => req.reject(new Error('No refresh token')));
                failedRequestsQueue = [];
                localStorage.clear();
                window.location.href = '/login';
                return Promise.reject(error);
            }

            if (!isRefreshing) {
                isRefreshing = true;

                try {
                    // Gửi yêu cầu refresh token
                    await requestRefreshToken();

                    // Xử lý lại tất cả các request bị lỗi 401 trước đó
                    failedRequestsQueue.forEach((req) => req.resolve());
                    failedRequestsQueue = [];
                } catch (refreshError) {
                    // Nếu refresh thất bại, đăng xuất
                    failedRequestsQueue.forEach((req) => req.reject(refreshError));
                    failedRequestsQueue = [];
                    localStorage.clear();
                    window.location.href = '/login'; // Chuyển về trang đăng nhập
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            }

            // Trả về một Promise để retry request sau khi token mới được cập nhật
            return new Promise((resolve, reject) => {
                failedRequestsQueue.push({
                    resolve: () => {
                        resolve(request(originalRequest));
                    },
                    reject: (err) => reject(err),
                });
            });
        }

        return Promise.reject(error);
    },
);
