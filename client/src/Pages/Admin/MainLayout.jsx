import React, { useEffect, useState } from 'react';
import { Layout, Menu } from 'antd';
import {
    HomeOutlined,
    UserOutlined,
    ShoppingCartOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    PlusOutlined,
} from '@ant-design/icons';
import Dashboard from './Components/Dashboard';
import ProductManagement from './Components/ProductManagement';
import UserManagement from './Components/UserManagement';
import AddProduct from './Pages/AddProduct';
import OrderManagement from './Components/OrderManagement';
import EditProduct from './Pages/EditProduct';
import { requestAdmin } from '../../Config/request';
import { useNavigate } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [activeComponent, setActiveComponent] = useState('dashboard');

    const [productId, setProductId] = useState();

    const menuItems = [
        {
            key: 'dashboard',
            icon: <HomeOutlined />,
            label: 'Trang chủ',
        },
        {
            key: 'users',
            icon: <UserOutlined />,
            label: 'Quản lý người dùng',
        },
        {
            key: 'orders',
            icon: <ShoppingCartOutlined />,
            label: 'Quản lý đơn hàng',
        },
        {
            key: 'products',
            icon: <PlusOutlined />,
            label: 'Quản lý sản phẩm',
        },
    ];

    const renderComponent = () => {
        switch (activeComponent) {
            case 'dashboard':
                return <Dashboard />;
            case 'products':
                return <ProductManagement setActiveComponent={setActiveComponent} setProductId={setProductId} />;
            case 'add-product':
                return <AddProduct setActiveComponent={setActiveComponent} />;
            case 'edit-product':
                return <EditProduct setActiveComponent={setActiveComponent} productId={productId} />;
            case 'users':
                return <UserManagement />;
            case 'orders':
                return <OrderManagement />;
            default:
                return <Dashboard />;
        }
    };

    const navigate = useNavigate();

    useEffect(() => {
        const fetchAdmin = async () => {
            try {
                await requestAdmin();
            } catch (error) {
                navigate('/');
            }
        };

        fetchAdmin();
    }, [navigate]);

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider trigger={null} collapsible collapsed={collapsed} width={280} style={{ paddingTop: '40px' }}>
                <Menu
                    theme="dark"
                    mode="inline"
                    defaultSelectedKeys={['dashboard']}
                    items={menuItems}
                    onClick={({ key }) => setActiveComponent(key)}
                    style={{ fontSize: '16px' }}
                />
            </Sider>
            <Layout>
                <Header style={{ padding: 0, background: '#fff' }}>
                    {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
                        className: 'trigger',
                        onClick: () => setCollapsed(!collapsed),
                        style: { fontSize: '18px', padding: '0 24px', cursor: 'pointer' },
                    })}
                </Header>
                <Content style={{ margin: '24px 16px', padding: 24, background: '#fff' }}>{renderComponent()}</Content>
            </Layout>
        </Layout>
    );
};

export default MainLayout;
