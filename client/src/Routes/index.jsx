import App from '../App';
import LoginUser from '../Pages/LoginUser/LoginUser';
import RegisterUser from '../Pages/RegisterUser/RegisterUser';
import DetailProduct from '../Pages/DetailProduct/DetailProduct';
import Category from '../Pages/Category/Category';
import CompareProduct from '../Pages/CompareProduct/CompareProduct';
import InfoUser from '../Pages/InfoUser/index';
import Cart from '../Pages/Cart/Cart';
import MainLayout from '../Pages/Admin/MainLayout';
import Payments from '../Pages/Payments/Payments';
import AdminLogin from '../Pages/Admin/AdminLogin';
import ProtectedAdminRoute from './ProtectedAdminRoute';

import Dashboard from '../Pages/Admin/Components/Dashboard';
import ProductManagement from '../Pages/Admin/Components/ProductManagement';
import UserManagement from '../Pages/Admin/Components/UserManagement';
import UpsertProduct from '../Pages/Admin/Pages/UpsertProduct';
import OrderManagement from '../Pages/Admin/Components/OrderManagement';
import CouponManagement from '../Pages/Admin/Components/CouponManagement';
import MessageManagement from '../Pages/Admin/Components/MessageManagement';
import ReviewManagement from '../Pages/Admin/Components/ReviewManagement';
import BrandManagement from '../Pages/Admin/Components/BrandManagement';
import ManagerProductType from '../Pages/Admin/Components/ManagerProductType/ManagerProductType';
import ManagerProductTypeEditor from '../Pages/Admin/Components/ManagerProductType/ManagerProductTypeEditor';
import CategoryManagement from '../Pages/Admin/Components/CategoryManagement';
import FlashSaleManagement from '../Pages/Admin/Components/FlashSaleManagement';


const publicRoutes = [
    { path: '/', component: <App /> },
    { path: '/login', component: <LoginUser /> },
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
        ],
    },
];


export { publicRoutes, privateRoutes };
