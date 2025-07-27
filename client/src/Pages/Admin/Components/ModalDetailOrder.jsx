import { Modal } from 'antd';
import { useEffect, useState } from 'react';
import { requestGetOnePayment } from '../../../Config/request';
import classNames from 'classnames/bind';
import styles from './ModalDetailOrder.module.scss';

const cx = classNames.bind(styles);

const ModalDetailOrder = ({ isModalVisible, setIsModalVisible, selectedOrder }) => {
    const [order, setOrder] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            const res = await requestGetOnePayment(selectedOrder);
            setOrder(res.metadata);
        };
        if (selectedOrder === '') {
            return;
        }
        fetchData();
    }, [isModalVisible, selectedOrder]);

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
                    <div className={cx('totalAmount')}>
                        Tổng tiền: <span>{order?.findPayment?.totalPrice?.toLocaleString()} đ</span>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ModalDetailOrder;
