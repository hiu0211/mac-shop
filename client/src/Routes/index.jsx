import App from '../App';
import LoginUser from '../Pages/LoginUser/LoginUser';
import RegisterUser from '../Pages/RegisterUser/RegisterUser';
import ForgotPassword from '../Pages/ForgotPassword/ForgotPassword';
import DetailProduct from '../Pages/DetailProduct/DetailProduct';
import Category from '../Pages/Category/Category';
import CompareProduct from '../Pages/CompareProduct/CompareProduct';
import InfoUser from '../Pages/InfoUser/index';
import Cart from '../Pages/Cart/Cart';
import MainLayout from '../Pages/Admin/MainLayout';
import Payments from '../Pages/Payments/Payments';
import AdminLogin from '../Pages/Admin/AdminLogin';
import ProtectedAdminRoute from './ProtectedAdminRoute';

import Dashboard from '../Pages/Admin/Dashboard/Dashboard';
import ProductManagement from '../Pages/Admin/ProductManagement/ProductManagement';
import UserManagement from '../Pages/Admin/UserManagement/UserManagement';
import UpsertProduct from '../Pages/Admin/ProductManagement/UpsertProduct';
import OrderManagement from '../Pages/Admin/OrderManagement/OrderManagement';
import CouponManagement from '../Pages/Admin/CouponManagement/CouponManagement';
import MessageManagement from '../Pages/Admin/MessageManagement/MessageManagement';
import ReviewManagement from '../Pages/Admin/ReviewManagement/ReviewManagement';
import BrandManagement from '../Pages/Admin/BrandManagement/BrandManagement';
import ManagerProductType from '../Pages/Admin/ManagerProductType/ManagerProductType';
import ManagerProductTypeEditor from '../Pages/Admin/ManagerProductType/ManagerProductTypeEditor';
import CategoryManagement from '../Pages/Admin/CategoryManagement/CategoryManagement';
import FlashSaleManagement from '../Pages/Admin/FlashSaleManagement/FlashSaleManagement';
import VipTierManagement from '../Pages/Admin/VipTierManagement/VipTierManagement';


const publicRoutes = [
    { path: '/', component: <App /> },
    { path: '/login', component: <LoginUser /> },
    { path: '/forgot-password', component: <ForgotPassword /> },
    { path: '/admin/login', component: <AdminLogin /> },
    { path: '/register', component: <RegisterUser /> },
    { path: '/product/:id', component: <DetailProduct /> },
    { path: '/category', component: <Category /> },
    { path: '/info-user/:id', component: <InfoUser /> },
    { path: '/cart', component: <Cart /> },
    { path: '/payment/:id', component: <Payments /> },
    { path: '/compare-product/:id1/:id2', component: <CompareProduct /> },
];

const privateRoutes = [
    {
        path: '/admin',
        component: (
            <ProtectedAdminRoute>
                <MainLayout />
            </ProtectedAdminRoute>
        ),
        children: [
            { index: true, component: <Dashboard /> },
            { path: 'products', component: <ProductManagement /> },
            { path: 'products/add', component: <UpsertProduct /> },
            { path: 'products/:productId/edit', component: <UpsertProduct /> },
            { path: 'product-types', component: <ManagerProductType /> },
            { path: 'product-types/add', component: <ManagerProductTypeEditor /> },
            { path: 'product-types/:productTypeId/edit', component: <ManagerProductTypeEditor /> },
            { path: 'categories', component: <CategoryManagement /> },
            { path: 'brands', component: <BrandManagement /> },
            { path: 'orders', component: <OrderManagement /> },
            { path: 'users', component: <UserManagement /> },
            { path: 'messages', component: <MessageManagement /> },
            { path: 'reviews', component: <ReviewManagement /> },
            { path: 'coupons', component: <CouponManagement /> },
            { path: 'flash-sales', component: <FlashSaleManagement /> },
            { path: 'vip-tiers', component: <VipTierManagement /> },
        ],
    },
];


export { publicRoutes, privateRoutes };
