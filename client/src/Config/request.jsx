import axios from 'axios';

import cookies from 'js-cookie';

const request = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
});

export const requestAdmin = async () => {
    const res = await request.get('/admin');
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

export const requestGetAllUser = async () => {
    const res = await request.get('/api/get-all-users');
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

export const requestGetAllProduct = async () => {
    const res = await request.get('/api/all-product');
    return res.data;
};

export const requestEditProduct = async (data) => {
    const res = await request.post('/api/edit-product', data);
    return res.data;
};

export const requestDeleteProduct = async (id) => {
    const res = await request.delete('/api/delete-product', { params: { id } });
    return res.data;
};

export const requestSearchProduct = async (keyword) => {
    const res = await request.get('/api/search-product', { params: { keyword } });
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

export const requestDeleteCart = async (productId) => {
    const res = await request.delete('/api/delete-cart', { params: { productId } });
    return res.data;
};

export const requestUpdateInfoUserCart = async (data) => {
    const res = await request.post('/api/update-info-user-cart', data);
    return res.data;
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

export const requestGetOrderAdmin = async () => {
    const res = await request.get('/api/get-order-admin');
    return res.data;
};

// export const requestUpdateCartQuantity = async (productId, quantity) => {
//     const res = await request.put(`/api/update-cart-quantity/${productId}`, { quantity });
//     return res.data;
// };

let isRefreshing = false;
let failedRequestsQueue = [];

request.interceptors.response.use(
    (response) => response, // Trả về nếu không có lỗi
    async (error) => {
        const originalRequest = error.config;

        // Nếu lỗi 401 (Unauthorized) và request chưa từng thử refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            if (!isRefreshing) {
                isRefreshing = true;

                try {
                    // Gửi yêu cầu refresh token
                    const token = cookies.get('logged');
                    if (!token) {
                        return;
                    }
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
