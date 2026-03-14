import { Button, Empty, Image, Input, Modal, Popconfirm, Rate, Space, Table, Tag, message } from 'antd';
import { DeleteOutlined, MessageOutlined, ReloadOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import {
    requestDeleteAdminReview,
    requestGetAdminReviews,
    requestReplyAdminReview,
} from '../../../Config/request';

function ReviewManagement() {
    const [loading, setLoading] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
    const [replyValue, setReplyValue] = useState('');
    const [selectedReview, setSelectedReview] = useState(null);
    const [isReplying, setIsReplying] = useState(false);

    const fetchReviews = async () => {
        try {
            setLoading(true);
            const res = await requestGetAdminReviews();
            const rawReviews = res?.metadata || [];
            setReviews(
                rawReviews.map((item) => ({
                    ...item,
                    key: item.reviewId,
                }))
            );
        } catch (error) {
            console.error(error);
            message.error(error?.response?.data?.message || 'Không thể tải danh sách đánh giá');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, []);

    const openReplyModal = (record) => {
        setSelectedReview(record);
        setReplyValue(record?.adminReply?.message || '');
        setIsReplyModalOpen(true);
    };

    const handleReplyReview = async () => {
        if (!selectedReview?.productId || !selectedReview?.reviewId) {
            message.error('Không tìm thấy đánh giá để phản hồi');
            return;
        }

        if (!replyValue.trim()) {
            message.error('Vui lòng nhập nội dung phản hồi');
            return;
        }

        try {
            setIsReplying(true);
            await requestReplyAdminReview({
                productId: selectedReview.productId,
                reviewId: selectedReview.reviewId,
                message: replyValue.trim(),
            });
            message.success('Phản hồi đánh giá thành công');
            setIsReplyModalOpen(false);
            setSelectedReview(null);
            setReplyValue('');
            await fetchReviews();
        } catch (error) {
            console.error(error);
            message.error(error?.response?.data?.message || 'Không thể phản hồi đánh giá');
        } finally {
            setIsReplying(false);
        }
    };

    const handleDeleteReview = async (record) => {
        try {
            await requestDeleteAdminReview(record.productId, record.reviewId);
            message.success('Xóa đánh giá thành công');
            await fetchReviews();
        } catch (error) {
            console.error(error);
            message.error(error?.response?.data?.message || 'Không thể xóa đánh giá');
        }
    };

    const columns = [
        {
            title: 'Sản phẩm',
            dataIndex: 'productName',
            key: 'productName',
            render: (_, record) => (
                <div style={{ maxWidth: 250, display: 'flex', alignItems: 'center', gap: 10 }}>
                    {record.productImage ? (
                        <img
                            src={record.productImage}
                            alt={record.productName}
                            style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6 }}
                        />
                    ) : (
                        <div style={{ width: 44, height: 44, borderRadius: 6, background: '#f5f5f5' }} />
                    )}
                    <span>{record.productName || 'Sản phẩm'}</span>
                </div>
            ),
        },
        {
            title: 'Người đánh giá',
            dataIndex: 'fullName',
            key: 'fullName',
        },
        {
            title: 'Số sao',
            dataIndex: 'rating',
            key: 'rating',
            render: (rating) => <Rate disabled value={rating} />,
        },
        // {
        //     title: 'Nội dung',
        //     dataIndex: 'comment',
        //     key: 'comment',
        //     render: (comment) => comment || 'Không có nhận xét',
        // },
        {
            title: 'Phản hồi',
            dataIndex: 'adminReply',
            key: 'adminReply',
            render: (adminReply) =>
                adminReply?.message ? (
                    <Tag color='green'>Đã phản hồi</Tag>
                ) : (
                    <Tag color='default'>Chưa phản hồi</Tag>
                ),
        },
        {
            title: 'Ngày đánh giá',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (createdAt) => new Date(createdAt).toLocaleDateString('vi-VN'),
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button title='Phản hồi' icon={<MessageOutlined />} onClick={() => openReplyModal(record)}>
                    </Button>
                    <Popconfirm
                        title='Xóa đánh giá'
                        description='Bạn có chắc muốn xóa đánh giá này?'
                        okText='Xóa'
                        cancelText='Hủy'
                        onConfirm={() => handleDeleteReview(record)}
                    >
                        <Button title='Xóa' danger icon={<DeleteOutlined />}>
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                <h2>Đánh giá sản phẩm</h2>
                <Button icon={<ReloadOutlined />} loading={loading} onClick={fetchReviews}>
                    Tải lại
                </Button>
            </Space>

            <Table
                columns={columns}
                dataSource={reviews}
                loading={loading}
                pagination={{ pageSize: 8 }}
                locale={{
                    emptyText: <Empty description='Chưa có đánh giá nào' />,
                }}
            />

            <Modal
                title='Phản hồi đánh giá'
                open={isReplyModalOpen}
                onCancel={() => setIsReplyModalOpen(false)}
                onOk={handleReplyReview}
                okText='Gửi phản hồi'
                cancelText='Đóng'
                confirmLoading={isReplying}
            >
                {selectedReview && (
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ marginBottom: 8, fontWeight: 500 }}>{selectedReview.productName}</div>
                        <Rate disabled value={selectedReview.rating} style={{ fontSize: 16, marginBottom: 8 }} />
                        <p style={{ marginBottom: 10, color: '#555' }}>
                            {selectedReview.comment || 'Không có nội dung nhận xét'}
                        </p>
                        {Array.isArray(selectedReview.images) && selectedReview.images.length > 0 && (
                            <Image.PreviewGroup>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                                    {selectedReview.images.map((img, index) => (
                                        <Image
                                            key={`${img}-${index}`}
                                            src={img}
                                            alt='review'
                                            width={70}
                                            height={70}
                                            style={{ objectFit: 'cover', borderRadius: 6 }}
                                        />
                                    ))}
                                </div>
                            </Image.PreviewGroup>
                        )}
                    </div>
                )}

                <Input.TextArea
                    rows={4}
                    placeholder='Nhập phản hồi cho khách hàng...'
                    value={replyValue}
                    onChange={(e) => setReplyValue(e.target.value)}
                />
            </Modal>
        </div>
    );
}

export default ReviewManagement;
