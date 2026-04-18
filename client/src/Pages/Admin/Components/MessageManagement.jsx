import { Button, Empty, Input, Modal, Popconfirm, Space, Table, Tag, message } from 'antd';
import { DeleteOutlined, MessageOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useStore } from '../../../hooks/useStore';
import {
    requestDeleteOrderContactMessage,
    requestGetOnePayment,
    requestGetOrderAdmin,
    requestReplyOrderContactMessage,
} from '../../../Config/request';

const statusColors = {
    pending: 'purple',
    completed: 'orange',
    shipping: 'blue',
    delivered: 'green',
    cancelled: 'red',
};

const statusText = {
    pending: 'Chờ xác nhận',
    completed: 'Đã xác nhận',
    shipping: 'Đang giao',
    delivered: 'Đã giao',
    cancelled: 'Đã hủy',
};

function MessageManagement() {
    const { dataUser } = useStore();
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [selectedOrderId, setSelectedOrderId] = useState('');
    const [selectedOrderInfo, setSelectedOrderInfo] = useState(null);
    const [orderProducts, setOrderProducts] = useState([]);
    const [messages, setMessages] = useState([]);
    const [replyValue, setReplyValue] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isReplying, setIsReplying] = useState(false);
    const [isDeletingMessage, setIsDeletingMessage] = useState(false);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await requestGetOrderAdmin();
            const rawOrders = response?.metadata || [];

            const mappedOrders = rawOrders
                .map((order) => {
                    const contactMessages = order.contactMessages || [];
                    const lastMessage = contactMessages[contactMessages.length - 1];
                    return {
                        key: order.orderId,
                        orderId: order.orderId,
                        customer: order.fullName,
                        phone: order.phone,
                        statusOrder: order.statusOrder,
                        createdAt: order.createdAt,
                        contactMessages,
                        totalMessages: contactMessages.length,
                        lastMessageText: lastMessage?.message || '',
                        lastMessageAt: lastMessage?.createdAt || order.createdAt,
                    };
                })
                .filter((order) => order.totalMessages > 0)
                .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

            setOrders(mappedOrders);
        } catch (error) {
            console.error(error);
            message.error('Không thể tải danh sách tin nhắn');
        } finally {
            setLoading(false);
        }
    };

    const fetchOrderMessages = async (orderId) => {
        try {
            const res = await requestGetOnePayment(orderId);
            const data = res?.metadata?.findPayment;
            const detailProducts = res?.metadata?.dataProduct || [];

            setSelectedOrderInfo(data || null);
            setOrderProducts(
                detailProducts.map((item) => ({
                    productId: item?.product?._id || '',
                    name: item?.product?.name || 'Sản phẩm',
                    image: item?.selectedColorImage || item?.product?.images?.[0] || '',
                    quantity: item?.quantity || 0,
                    price: Number(item?.price || item?.unitPrice || item?.product?.price || 0),
                    selectedColorName: item?.selectedColorName || '',
                }))
            );
            setMessages(data?.contactMessages || []);
        } catch (error) {
            console.error(error);
            message.error(error?.response?.data?.message || 'Không thể tải hội thoại');
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const filteredOrders = orders.filter((order) => {
        const keyword = searchText.trim().toLowerCase();
        if (!keyword) return true;
        return (
            order.customer?.toLowerCase().includes(keyword) ||
            order.lastMessageText?.toLowerCase().includes(keyword)
        );
    });

    const openConversation = async (record) => {
        setSelectedOrderId(record.orderId);
        setReplyValue('');
        setOrderProducts([]);
        setIsModalOpen(true);
        await fetchOrderMessages(record.orderId);
    };

    const handleReply = async () => {
        if (!replyValue.trim() || !selectedOrderId) {
            message.error('Vui lòng nhập nội dung phản hồi');
            return;
        }

        try {
            setIsReplying(true);
            await requestReplyOrderContactMessage({
                orderId: selectedOrderId,
                message: replyValue.trim(),
            });
            setReplyValue('');
            await fetchOrderMessages(selectedOrderId);
            await fetchOrders();
            message.success('Gửi phản hồi thành công');
        } catch (error) {
            console.error(error);
            message.error(error?.response?.data?.message || 'Không thể gửi phản hồi');
        } finally {
            setIsReplying(false);
        }
    };

    const handleDeleteMessage = async (messageId) => {
        if (!selectedOrderId || !messageId) {
            message.error('Không tìm thấy tin nhắn để xóa');
            return;
        }

        try {
            setIsDeletingMessage(true);
            await requestDeleteOrderContactMessage(selectedOrderId, messageId);
            await fetchOrderMessages(selectedOrderId);
            await fetchOrders();
            message.success('Xóa tin nhắn thành công');
        } catch (error) {
            console.error(error);
            message.error(error?.response?.data?.message || 'Không thể xóa tin nhắn');
        } finally {
            setIsDeletingMessage(false);
        }
    };

    const canDeleteMessage = (item) => {
        const currentUserId = dataUser?.id || dataUser?._id;
        if (!currentUserId) return false;
        return item?.senderType === 'admin' && String(item?.senderId || '') === String(currentUserId);
    };

    const columns = [
        {
            title: 'Khách hàng',
            dataIndex: 'customer',
            key: 'customer',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'statusOrder',
            key: 'statusOrder',
            width: 140,
            render: (status) => <Tag color={statusColors[status] || 'default'}>{statusText[status] || status}</Tag>,
        },
        {
            title: 'Tin nhắn gần nhất',
            dataIndex: 'lastMessageText',
            key: 'lastMessageText',
            ellipsis: true,
            render: (value) => value || 'Chưa có tin nhắn',
        },
        {
            title: 'Số tin nhắn',
            dataIndex: 'totalMessages',
            key: 'totalMessages',
            align: 'center',
            width: 120,
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 130,
            render: (_, record) => (
                <Button icon={<MessageOutlined />} onClick={() => openConversation(record)}>
                    Trả lời
                </Button>
            ),
        },
    ];

    return (
        <div>
            <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                <h2>Tin nhắn khách hàng</h2>
                <Button icon={<ReloadOutlined />} onClick={fetchOrders} loading={loading}>
                    Tải lại
                </Button>
            </Space>

            {/* Search */}
            <Input
                allowClear
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="Tìm theo tên khách hàng, nội dung tin nhắn ..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ marginBottom: 16, maxWidth: 380 }}
            />

            <Table
                columns={columns}
                dataSource={filteredOrders}
                loading={loading}
                pagination={{ pageSize: 8 }}
            />

            <Modal
                title="Chi tiết tin nhắn"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={760}
            >
                <div style={{ marginBottom: 12, color: '#555' }}>
                    <strong>Khách hàng:</strong> {selectedOrderInfo?.fullName || 'N/A'}
                </div>

                <div
                    style={{
                        marginBottom: 12,
                        border: '1px solid #f0f0f0',
                        borderRadius: 8,
                        padding: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                    }}
                >
                    <strong>Sản phẩm trong đơn:</strong>
                    {orderProducts.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có sản phẩm" />
                    ) : (
                        orderProducts.map((item, index) => (
                            <div
                                key={`${item.productId}-${index}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '8px 0',
                                    borderBottom: index < orderProducts.length - 1 ? '1px solid #f5f5f5' : 'none',
                                }}
                            >
                                {item.image ? (
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }}
                                    />
                                ) : (
                                    <div style={{ width: 48, height: 48, borderRadius: 6, background: '#f5f5f5' }} />
                                )}
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 500 }}>{item.name}</div>
                                    {item.selectedColorName && (
                                        <div style={{ fontSize: 12, color: '#666' }}>Màu: {item.selectedColorName}</div>
                                    )}
                                    <div style={{ fontSize: 12, color: '#888' }}>
                                        x{item.quantity} - {item.price?.toLocaleString?.('vi-VN') || item.price} đ
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div
                    style={{
                        maxHeight: 320,
                        overflowY: 'auto',
                        border: '1px solid #f0f0f0',
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                    }}
                >
                    {messages.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có tin nhắn" />
                    ) : (
                        messages.map((item, index) => (
                            <div
                                key={item._id || `${item.createdAt}-${index}`}
                                style={{
                                    background: item.senderType === 'admin' ? '#f6ffed' : '#f5f5f5',
                                    borderRadius: 8,
                                    padding: '10px 12px',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: 0 }}>{item.message}</p>
                                        <span style={{ fontSize: 12, color: '#888' }}>
                                            {item.senderName || (item.senderType === 'admin' ? 'Shop' : 'Khách hàng')} -{' '}
                                            {new Date(item.createdAt).toLocaleString('vi-VN')}
                                        </span>
                                    </div>
                                    <Popconfirm
                                        title="Xóa tin nhắn"
                                        description="Bạn có chắc muốn xóa tin nhắn này?"
                                        okText="Xóa"
                                        cancelText="Hủy"
                                        onConfirm={() => handleDeleteMessage(item._id)}
                                        disabled={!item._id || !canDeleteMessage(item)}
                                    >
                                        <Button
                                            danger
                                            size="small"
                                            icon={<DeleteOutlined />}
                                            loading={isDeletingMessage}
                                            disabled={!item._id || !canDeleteMessage(item)}
                                        />
                                    </Popconfirm>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <Input.TextArea
                    rows={4}
                    placeholder="Nhập phản hồi cho khách hàng..."
                    value={replyValue}
                    onChange={(e) => setReplyValue(e.target.value)}
                />

                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button type="primary" loading={isReplying} onClick={handleReply}>
                        Gửi phản hồi
                    </Button>
                </div>
            </Modal>
        </div>
    );
}

export default MessageManagement;