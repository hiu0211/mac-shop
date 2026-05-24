import React, { useState, useEffect } from 'react';
import { Table, Space, Button, Input, Tag, Select, Popconfirm } from 'antd';
import { SearchOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { requestDeleteOrder, requestGetOrderAdmin, requestUpdateStatusOrder } from '../../../Config/request';
import ModalDetailOrder from './ModalDetailOrder';

const DEFAULT_STATUS_FILTER = 'all';

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

    const columns = [
        // {
        //     title: 'Mã đơn hàng',
        //     dataIndex: 'id',
        //     key: 'id',
        //     width: 220,
        // },
        {
            title: 'Khách hàng',
            dataIndex: 'customer',
            key: 'customer',
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
                const formattedOrders = response.metadata.map((order) => ({
                    key: order.orderId,
                    id: order.orderId,
                    customer: order.fullName,
                    phone: `0${order.phone}`,
                    address: order.address,
                    date: new Date(order.createdAt).toLocaleDateString('vi-VN'),
                    total: `${order.totalPrice?.toLocaleString() || 0} VNĐ`,
                    status: order.statusOrder,
                    typePayments: order.typePayments,
                    products: order.products,
                }));
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
            />
        </div>
    );
};

export default OrderManagement;