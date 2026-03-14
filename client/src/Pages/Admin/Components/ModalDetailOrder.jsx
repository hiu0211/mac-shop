import { Button, Empty, Input, Modal } from 'antd';
import { useEffect, useState } from 'react';
import { requestGetOnePayment } from '../../../Config/request';
import classNames from 'classnames/bind';
import styles from './ModalDetailOrder.module.scss';

const cx = classNames.bind(styles);

const ModalDetailOrder = ({ isModalVisible, setIsModalVisible, selectedOrder }) => {
    const [order, setOrder] = useState({});
    // const [adminMessage, setAdminMessage] = useState('');
    // const [isSending, setIsSending] = useState(false);

    const fetchData = async () => {
        const res = await requestGetOnePayment(selectedOrder);
        setOrder(res.metadata);
    };

    useEffect(() => {
        if (selectedOrder === '') {
            return;
        }
        fetchData();
    }, [isModalVisible, selectedOrder]);

    // const handleReplyMessage = async () => {
    //     if (!adminMessage.trim()) {
    //         message.error('Vui lòng nhập nội dung phản hồi');
    //         return;
    //     }

    //     try {
    //         setIsSending(true);
    //         await requestReplyOrderContactMessage({
    //             orderId: selectedOrder,
    //             message: adminMessage.trim(),
    //         });
    //         setAdminMessage('');
    //         await fetchData();
    //         message.success('Đã gửi phản hồi cho khách hàng');
    //     } catch (error) {
    //         console.error(error);
    //         message.error(error?.response?.data?.message || 'Không thể gửi phản hồi');
    //     } finally {
    //         setIsSending(false);
    //     }
    // };

    return (
        <Modal
            title="Chi tiết đơn hàng"
            open={isModalVisible}
            onCancel={() => setIsModalVisible(false)}
            width={800}
            footer={null}
        >
            <div className={cx('modalContent')}>
                <div className={cx('section')}>
                    <h3 className={cx('sectionTitle')}>Thông tin khách hàng</h3>
                    <div className={cx('customerInfo')}>
                        <div className={cx('infoGrid')}>
                            <span className={cx('label')}>Người nhận:</span>
                            <span className={cx('value')}>{order?.findPayment?.fullName}</span>

                            <span className={cx('label')}>Địa chỉ:</span>
                            <span className={cx('value')}>{order?.findPayment?.address}</span>

                            <span className={cx('label')}>Số điện thoại:</span>
                            <span className={cx('value')}>0{order?.findPayment?.phone}</span>
                        </div>
                    </div>
                </div>

                <div className={cx('section')}>
                    <h3 className={cx('sectionTitle')}>Danh sách sản phẩm</h3>
                    <div className={cx('productList')}>
                        {order?.dataProduct?.map((item) => (
                            <div key={item?.product?._id} className={cx('productItem')}>
                                <img
                                    className={cx('productImage')}
                                    src={item?.product.images[0]}
                                    alt={item?.product?.name}
                                />
                                <div className={cx('productDetails')}>
                                    <h4 className={cx('productName')}>{item?.product?.name}</h4>
                                    <div className={cx('productMeta')}>
                                        <span className={cx('quantity')}>Số lượng: x{item?.quantity}</span>
                                        <span className={cx('price')}>{item?.product?.price.toLocaleString()} đ</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={cx('orderTotal')}>
                    {order?.findPayment?.discountAmount > 0 && (
                        <div className={cx('totalAmount')}>
                            Khuyến mãi: <span>{order?.findPayment?.discountAmount?.toLocaleString()} đ</span>
                        </div>
                    )}
                    <div className={cx('totalAmount')}>
                        Tổng tiền: <span>{order?.findPayment?.totalPrice?.toLocaleString()} đ</span>
                    </div>
                </div>

                {/* <div className={cx('section')}>
                    <h3 className={cx('sectionTitle')}>Trao đổi với khách hàng</h3>
                    <div className={cx('chatList')}>
                        {(order?.findPayment?.contactMessages || []).length === 0 ? (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có tin nhắn" />
                        ) : (
                            order?.findPayment?.contactMessages?.map((item, index) => (
                                <div key={`${item.createdAt}-${index}`} className={cx('chatItem')}>
                                    <p>{item.message}</p>
                                    <span>
                                        {item.senderName || (item.senderType === 'admin' ? 'Shop' : 'Khách hàng')} -{' '}
                                        {new Date(item.createdAt).toLocaleString('vi-VN')}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                    <div className={cx('chatReply')}>
                        <Input.TextArea
                            rows={3}
                            placeholder="Nhập phản hồi cho khách hàng..."
                            value={adminMessage}
                            onChange={(e) => setAdminMessage(e.target.value)}
                        />
                        <Button type="primary" loading={isSending} onClick={handleReplyMessage}>
                            Gửi phản hồi
                        </Button>
                    </div>
                </div> */}
            </div>
        </Modal>
    );
};

export default ModalDetailOrder;
