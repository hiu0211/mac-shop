import React, { useEffect, useState, useMemo } from 'react';
import { Avatar, Badge, Layout, Menu, Tooltip } from 'antd';
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
    BellOutlined,
    SettingOutlined,
    EllipsisOutlined,
    ThunderboltOutlined,
    CrownOutlined,
} from '@ant-design/icons';


import { requestAdmin, requestLogout } from '../../Config/request';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './MainLayout.module.scss';

const { Header, Sider, Content } = Layout;
const cx = classNames.bind(styles);

const MainLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const menuItems = useMemo(() => [
        {
            type: 'group',
            label: 'TỔNG QUAN',
            children: [
                {
                    key: 'dashboard',
                    icon: <HomeOutlined />,
                    label: 'Trang chủ',
                },
            ],
        },
        {
            type: 'group',
            label: 'DANH MỤC',
            children: [
                {
                    key: 'products',
                    icon: <ProductOutlined />,
                    label: 'Sản phẩm',
                },
                {
                    key: 'product-types',
                    icon: <AppstoreOutlined />,
                    label: 'Loại sản phẩm',
                },
                {
                    key: 'categories',
                    icon: <TagOutlined />,
                    label: 'Danh mục',
                },
                {
                    key: 'brands',
                    icon: <MobileOutlined />,
                    label: 'Hãng sản xuất',
                },
            ],
        },
        {
            type: 'group',
            label: 'BÁN HÀNG',
            children: [
                {
                    key: 'orders',
                    icon: <ShoppingCartOutlined />,
                    label: 'Đơn hàng',
                },
                {
                    key: 'coupons',
                    icon: <GiftOutlined />,
                    label: 'Mã giảm giá',
                },
                {
                    key: 'flash-sales',
                    icon: <ThunderboltOutlined />,
                    label: 'Flash Sale',
                },
                {
                    key: 'vip-tiers',
                    icon: <CrownOutlined />,
                    label: 'Hạng VIP',
                },
                {
                    key: 'users',
                    icon: <UserOutlined />,
                    label: 'Người dùng',
                },
            ],

        },
        {
            type: 'group',
            label: 'TƯƠNG TÁC',
            children: [
                {
                    key: 'messages',
                    icon: <MessageOutlined />,
                    label: 'Tin nhắn',
                },
                {
                    key: 'reviews',
                    icon: <CommentOutlined />,
                    label: 'Đánh giá',
                },
            ],
        },
    ], []);

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
            navigate('/login');
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

    const getCurrentPageTitle = () => {
        switch (currentKey) {
            case 'dashboard': return 'Tổng quan';
            case 'products': return 'Quản lý sản phẩm';
            case 'product-types': return 'Quản lý loại sản phẩm';
            case 'orders': return 'Quản lý đơn hàng';
            case 'categories': return 'Quản lý danh mục';
            case 'brands': return 'Quản lý hãng sản xuất';
            case 'users': return 'Quản lý người dùng';
            case 'messages': return 'Tin nhắn';
            case 'reviews': return 'Quản lý đánh giá';
            case 'coupons': return 'Quản lý mã giảm giá';
            case 'flash-sales': return 'Quản lý Flash Sale';
            case 'vip-tiers': return 'Quản lý hạng VIP';
            default: return 'Trang quản trị';

        }
    };

    return (
        <Layout className={cx('wrapper')}>
            <Sider
                collapsible
                collapsed={collapsed}
                width={280}
                onCollapse={(value) => setCollapsed(value)}
                className={cx('sider')}
                trigger={null}
            >
                <div className={cx('logo-container')}>
                    <div className={cx('logo-icon')}>M</div>
                    {!collapsed && <span className={cx('logo-text')}>Mac Shop</span>}
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[currentKey]}
                    items={menuItems}
                    onClick={handleMenuClick}
                />
                <div className={cx('user-footer')}>
                    <Avatar className={cx('user-avatar')}>AD</Avatar>
                    {!collapsed && (
                        <div className={cx('user-info')}>
                            <span className={cx('user-name')}>Admin</span>
                            <span className={cx('user-role')}>Quản trị viên</span>
                        </div>
                    )}
                </div>
            </Sider>
            <Layout>
                <Header className={cx('header')}>
                    <div className={cx('header-left')}>
                        <button
                            type="button"
                            className={cx('collapse-btn')}
                            onClick={() => setCollapsed(!collapsed)}
                        >
                            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        </button>
                        <div className={cx('breadcrumbs')}>
                            <HomeOutlined className={cx('breadcrumb-home')} onClick={() => {
                                navigate('/admin');
                            }} />
                            <span className={cx('breadcrumb-separator')}>/</span>
                            <span className={cx('breadcrumb-current')}>{getCurrentPageTitle()}</span>
                        </div>
                    </div>

                    <div className={cx('header-right')}>
                        <Badge dot color="#ef4444" offset={[-2, 2]}>
                            <button className={cx('icon-btn')}>
                                <BellOutlined />
                            </button>
                        </Badge>

                        <button className={cx('icon-btn')}>
                            <SettingOutlined />
                        </button>

                        <Tooltip title="Đăng xuất">
                            <button className={cx('icon-btn')} onClick={handleLogout}>
                                <LogoutOutlined />
                            </button>
                        </Tooltip>

                        <div className={cx('header-user')}>
                            <Avatar className={cx('header-avatar')}>A</Avatar>
                            <button className={cx('more-btn')}>
                                <EllipsisOutlined />
                            </button>
                        </div>
                    </div>
                </Header>
                <Content className={cx('content')}>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};

export default MainLayout;
