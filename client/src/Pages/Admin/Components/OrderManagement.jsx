import React, { useState, useEffect } from 'react';
import { Table, Space, Button, Input, Tag, Select, Popconfirm, Modal } from 'antd';
import { SearchOutlined, EyeOutlined, DeleteOutlined, UserAddOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { requestDeleteOrder, requestGetOrderAdmin, requestUpdateStatusOrder, requestCreateUserFromOrder } from '../../../Config/request';
import ModalDetailOrder from './ModalDetailOrder';

const DEFAULT_STATUS_FILTER = 'all';

const renderVipTag = (vipTier) => {
    let text = 'Thành viên';
    let textColor = '#8C5A2B';
    let bgColor = '#FEF3D6';

    switch (vipTier) {
        case 'dong':
            text = 'Hạng Đồng (2%)';
            textColor = '#cd7f32';
            bgColor = '#FDF3E7';
            break;
        case 'bac':
            text = 'Hạng Bạc (5%)';
            textColor = '#718096';
            bgColor = '#EDF2F7';
            break;
        case 'vang':
            text = 'Hạng Vàng (10%)';
            textColor = '#d69e2e';
            bgColor = '#FEF3D6';
            break;
        case 'kimcuong':
            text = 'Hạng Kim Cương (15%)';
            textColor = '#00b5d8';
            bgColor = '#E0F2FE';
            break;
        default:
            text = 'Thành viên';
            textColor = '#8C5A2B';
            bgColor = '#FEF3D6';
            break;
    }

    return (
        <Tag
            style={{
                borderRadius: 12,
                border: 'none',
                backgroundColor: bgColor,
                color: textColor,
                fontSize: 11,
                padding: '2px 8px',
                margin: 0,
                display: 'inline-flex',
                alignItems: 'center',
                fontWeight: 500,
            }}
        >
            {text}
        </Tag>
    );
};

const OrderManagement = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState(DEFAULT_STATUS_FILTER);

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState('');

    const statusOptions = [
        { label: 'Chờ xác nhận', value: 'pending' },
        { label: 'Đã xác nhận', value: 'completed' },
        { label: 'Đang giao', value: 'shipping' },
        { label: 'Đã giao', value: 'delivered' },
        { label: 'Đã hủy', value: 'cancelled' },
    ];

    const handleShowModal = (order) => {
        setSelectedOrder(order.id);
        console.log(order);
        setIsModalVisible(true);
    };

    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            setLoading(true);
            await requestUpdateStatusOrder({ orderId, statusOrder: newStatus });
            message.success('Cập nhật trạng thái thành công');
            await fetchOrders(statusFilter);
        } catch (error) {
            console.error(error);
            message.error('Cập nhật trạng thái thất bại');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteOrder = async (orderId) => {
        if (!orderId) return;

        try {
            setLoading(true);
            await requestDeleteOrder(orderId);
            message.success('Xóa đơn hàng thành công');

            if (selectedOrder === orderId) {
                setIsModalVisible(false);
                setSelectedOrder('');
            }

            await fetchOrders(statusFilter);
        } catch (error) {
            console.error(error);
            message.error(error?.response?.data?.message || 'Xóa đơn hàng thất bại');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUserFromOrder = async (orderId) => {
        if (!orderId) return;

        try {
            setLoading(true);
            const res = await requestCreateUserFromOrder(orderId);
            message.success(res?.message || 'Đã tạo tài khoản thành công');
            await fetchOrders(statusFilter);
        } catch (error) {
            console.error(error);
            message.error(error?.response?.data?.message || 'Không thể tạo tài khoản từ đơn hàng');
        } finally {
            setLoading(false);
        }
    };

    const showConfirmCreateUser = (record) => {
        Modal.confirm({
            title: 'Tạo tài khoản người dùng',
            content: `Tạo tài khoản cho ${record.customer} (${record.email}) và gửi email thông tin đăng nhập?`,
            okText: 'Tạo tài khoản',
            cancelText: 'Hủy',
            onOk: () => handleCreateUserFromOrder(record.id),
        });
    };

    const columns = [
        {
            title: 'Khách hàng',
            dataIndex: 'customer',
            key: 'customer',
            render: (customer, record) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 500 }}>{customer}</span>
                    {record.isGuest ? (
                        <Tag
                            style={{
                                borderRadius: 12,
                                border: 'none',
                                backgroundColor: '#FFF3E0',
                                color: '#D97706',
                                fontSize: 11,
                                padding: '2px 8px',
                                margin: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                fontWeight: 500,
                            }}
                        >
                            Khách vãng lai
                        </Tag>
                    ) : (
                        renderVipTag(record.vipTier)
                    )}
                </div>
            ),
        },
        {
            title: 'Số điện thoại',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: 'Ngày đặt',
            dataIndex: 'date',
            key: 'date',
        },
        {
            title: 'Tổng tiền',
            dataIndex: 'total',
            key: 'total',
        },
        {
            title: 'Phương thức',
            dataIndex: 'typePayments',
            key: 'typePayments',
            render: (type) => <Tag color={type === 'COD' ? 'green' : type === 'MOMO' ? 'pink' : 'blue'}>{type}</Tag>,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status, record) => (
                <Select
                    value={status}
                    style={{ width: 150 }}
                    onChange={(value) => handleUpdateStatus(record.id, value)}
                    options={statusOptions}
                />
            ),
        },
        {
            title: 'Thao tác',
            key: 'action',
            align: 'center',
            render: (_, record) => (
                <Space size="middle">
                    <Button title='Xem chi tiết đơn hàng' icon={<EyeOutlined />} onClick={() => handleShowModal(record)}>
                    </Button>
                    {record.isGuest && record.email && (
                        <Button
                            type="primary"
                            ghost
                            title="Tạo tài khoản người dùng từ đơn hàng này"
                            icon={<UserAddOutlined />}
                            onClick={() => showConfirmCreateUser(record)}
                        />
                    )}
                    {record.status === 'cancelled' && (
                        <Popconfirm
                            title="Xóa đơn hàng"
                            description="Bạn có chắc muốn xóa đơn hàng này không?"
                            okText="Xóa"
                            cancelText="Hủy"
                            onConfirm={() => handleDeleteOrder(record.id)}
                        >
                            <Button danger title='Xóa đơn hàng' icon={<DeleteOutlined />}>
                            </Button>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    const fetchOrders = async (statusOrder = DEFAULT_STATUS_FILTER) => {
        try {
            setLoading(true);
            const params = {};
            if (statusOrder && statusOrder !== DEFAULT_STATUS_FILTER) {
                params.statusOrder = statusOrder;
            }

            const response = await requestGetOrderAdmin(params);
            if (response.metadata) {
                const formattedOrders = response.metadata.map((order) => {
                    const isGuest = !order.userId || String(order.userId).startsWith('guest_');
                    return {
                        key: order.orderId,
                        id: order.orderId,
                        userId: order.userId,
                        email: order.email || '',
                        isGuest,
                        customer: order.fullName,
                        phone: `0${order.phone}`,
                        address: order.address,
                        date: new Date(order.createdAt).toLocaleDateString('vi-VN'),
                        total: `${order.totalPrice?.toLocaleString() || 0} VNĐ`,
                        status: order.statusOrder,
                        typePayments: order.typePayments,
                        products: order.products,
                        vipTier: order.vipTier || 'none',
                    };
                });
                setOrders(formattedOrders);
            }
        } catch (error) {
            console.error(error);
            message.error('Không thể tải danh sách đơn hàng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders(statusFilter);
    }, [statusFilter]);

    const statusFilterOptions = [
        { label: 'Tất cả trạng thái', value: DEFAULT_STATUS_FILTER },
        ...statusOptions,
    ];

    // Lọc đơn hàng theo searchText
    const filteredOrders = orders.filter((order) => {
        const searchLower = searchText.toLowerCase();
        return (
            order.id?.toLowerCase().includes(searchLower) ||
            order.customer?.toLowerCase().includes(searchLower) ||
            order.phone?.toLowerCase().includes(searchLower) ||
            order.address?.toLowerCase().includes(searchLower)
        );
    });

    return (
        <div>
            <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                <h2>Quản lý đơn hàng</h2>
            </Space>

            <Space wrap size={12} style={{ marginBottom: 16 }}>
                <Input
                    placeholder="Tìm kiếm đơn hàng"
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                    style={{ width: 350 }}
                />

                <Select
                    value={statusFilter}
                    allowClear
                    placeholder="Lọc theo trạng thái"
                    onChange={(value) => setStatusFilter(value || DEFAULT_STATUS_FILTER)}
                    options={statusFilterOptions}
                    style={{ width: 220 }}
                />
            </Space>
            <Table columns={columns} dataSource={filteredOrders} loading={loading} pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Tổng số ${total} đơn hàng`,
            }} />
            <ModalDetailOrder
                isModalVisible={isModalVisible}
                setIsModalVisible={setIsModalVisible}
                selectedOrder={selectedOrder}
                onOrderUpdated={() => fetchOrders(statusFilter)}
            />
        </div>
    );
};

export default OrderManagement;