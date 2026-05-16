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

import { requestAdmin, requestLogout } from '../../Config/request';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

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

        navigate(`/admin${key === 'dashboard' ? '' : '/' + key}`);
    };

    // Determine current menu key based on URL path
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const currentKey = pathSegments.length > 1 ? pathSegments[1] : 'dashboard';

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider trigger={null} collapsible collapsed={collapsed} width={280} style={{ paddingTop: '40px' }}>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[currentKey]}
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
                <Content style={{ margin: '24px 16px', padding: 24, background: '#fff' }}><Outlet /></Content>
            </Layout>
        </Layout>
    );
};

export default MainLayout;
