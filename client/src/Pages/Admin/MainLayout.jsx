import React, { useEffect, useState } from 'react';
import { Button, Layout, Menu } from 'antd';
import {
    HomeOutlined,
    UserOutlined,
    ShoppingCartOutlined,
    MessageOutlined,
    CommentOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    ProductOutlined,
    GiftOutlined,
    LogoutOutlined,
    MobileOutlined,
    TagOutlined,
    AppstoreOutlined,
} from '@ant-design/icons';
import Dashboard from './Components/Dashboard';
import ProductManagement from './Components/ProductManagement';
import UserManagement from './Components/UserManagement';
import AddProduct from './Pages/AddProduct';
import OrderManagement from './Components/OrderManagement';
import EditProduct from './Pages/EditProduct';
import CouponManagement from './Components/CouponManagement';
import MessageManagement from './Components/MessageManagement';
import ReviewManagement from './Components/ReviewManagement';
import BrandManagement from './Components/BrandManagement';
import ManagerProductType from './Components/ManagerProductType/ManagerProductType';
import ManagerProductTypeEditor from './Components/ManagerProductType/ManagerProductTypeEditor';
import CategoryManagement from './Components/CategoryManagement'; // Importing CategoryManagement
import { requestAdmin, requestLogout } from '../../Config/request';
import { useNavigate } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [activeComponent, setActiveComponent] = useState('dashboard');

    const [productId, setProductId] = useState();
    const [productTypeId, setProductTypeId] = useState();

    const menuItems = [
        {
            key: 'dashboard',
            icon: <HomeOutlined />,
            label: 'Trang chủ',
        },
        {
            key: 'products',
            icon: <ProductOutlined />,
            label: 'Quản lý sản phẩm',
        },
        {
            key: 'product-types',
            icon: <AppstoreOutlined />,
            label: 'Quản lý loại sản phẩm',
        },
        {
            key: 'categories',
            icon: <TagOutlined />,
            label: 'Quản lý danh mục',
        },
        {
            key: 'brands',
            icon: <MobileOutlined />,
            label: 'Quản lý hãng sản xuất',
        },
        {
            key: 'orders',
            icon: <ShoppingCartOutlined />,
            label: 'Quản lý đơn hàng',
        },
        {
            key: 'users',
            icon: <UserOutlined />,
            label: 'Quản lý người dùng',
        },
        {
            key: 'messages',
            icon: <MessageOutlined />,
            label: 'Tin nhắn',
        },
        {
            key: 'reviews',
            icon: <CommentOutlined />,
            label: 'Đánh giá sản phẩm',
        },
        {
            key: 'coupons',
            icon: <GiftOutlined />,
            label: 'Quản lý mã giảm giá',
        },
    ];

    const renderComponent = () => {
        switch (activeComponent) {
            case 'dashboard':
                return <Dashboard />;
            case 'products':
                return <ProductManagement setActiveComponent={setActiveComponent} setProductId={setProductId} />;
            case 'product-types':
                return (
                    <ManagerProductType
                        setActiveComponent={setActiveComponent}
                        setProductTypeId={setProductTypeId}
                    />
                );
            case 'add-product-type':
                return <ManagerProductTypeEditor setActiveComponent={setActiveComponent} />;
            case 'edit-product-type':
                return (
                    <ManagerProductTypeEditor
                        setActiveComponent={setActiveComponent}
                        productTypeId={productTypeId}
                    />
                );
            case 'add-product':
                return <AddProduct setActiveComponent={setActiveComponent} />;
            case 'edit-product':
                return <EditProduct setActiveComponent={setActiveComponent} productId={productId} />;
            case 'users':
                return <UserManagement />;
            case 'orders':
                return <OrderManagement />;
            case 'messages':
                return <MessageManagement />;
            case 'reviews':
                return <ReviewManagement />;
            case 'coupons':
                return <CouponManagement />;
            case 'categories':
                return <CategoryManagement />;
            case 'brands':
                return <BrandManagement />;
            default:
                return <Dashboard />;
        }
    };

    const navigate = useNavigate();

    useEffect(() => {
        const fetchAdmin = async () => {
            try {
                await requestAdmin();
            } catch {
                navigate('/admin/login');
            }
        };

        fetchAdmin();
    }, [navigate]);

    const handleLogout = async () => {
        try {
            await requestLogout();
        } catch (error) {
            console.error('Logout error:', error.response?.data?.message);
        } finally {
            localStorage.clear();
            navigate('/admin/login');
        }
    };

    const handleMenuClick = ({ key }) => {
        if (key === 'logout') {
            handleLogout();
            return;
        }

        setActiveComponent(key);
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider trigger={null} collapsible collapsed={collapsed} width={280} style={{ paddingTop: '40px' }}>
                <Menu
                    theme="dark"
                    mode="inline"
                    defaultSelectedKeys={['dashboard']}
                    items={menuItems}
                    onClick={handleMenuClick}
                    style={{ fontSize: '16px' }}
                />
            </Sider>
            <Layout>
                <Header
                    style={{
                        padding: 0,
                        background: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
                        className: 'trigger',
                        onClick: () => setCollapsed(!collapsed),
                        style: { fontSize: '18px', padding: '0 24px', cursor: 'pointer' },
                    })}
                    <Button
                        icon={<LogoutOutlined />}
                        onClick={handleLogout}
                        style={{ marginRight: '16px' }}
                    >
                        Đăng xuất
                    </Button>
                </Header>
                <Content style={{ margin: '24px 16px', padding: 24, background: '#fff' }}>{renderComponent()}</Content>
            </Layout>
        </Layout>
    );
};

export default MainLayout;
