import { Button, Empty, Input, Modal, Tag, Divider } from 'antd';
import { CrownOutlined, TagOutlined, CreditCardOutlined, UserOutlined, PhoneOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { requestGetOnePayment } from '../../../Config/request';
import classNames from 'classnames/bind';
import styles from './ModalDetailOrder.module.scss';

const cx = classNames.bind(styles);

const ModalDetailOrder = ({ isModalVisible, setIsModalVisible, selectedOrder }) => {
    const [order, setOrder] = useState({});
    const totalPriceAfterDiscount = Number(
        order?.findPayment?.totalPriceAfterDiscount ?? order?.findPayment?.totalPrice ?? 0,
    );

    useEffect(() => {
        if (!selectedOrder) {
            return;
        }
        const fetchData = async () => {
            const res = await requestGetOnePayment(selectedOrder);
            setOrder(res.metadata);
        };
        fetchData();
    }, [isModalVisible, selectedOrder]);

    return (
        <Modal
            title="Chi tiết đơn hàng"
            open={isModalVisible}
            onCancel={() => setIsModalVisible(false)}
            width={850}
            footer={null}
        >
            <div className={cx('modalContent')}>
                {/* HÀNG 1: Danh sách sản phẩm */}
                <div className={cx('section')}>
                    <h3 className={cx('sectionTitle')}>Danh sách sản phẩm</h3>
                    <div className={cx('productList')}>
                        {order?.dataProduct?.map((item, index) => (
                            <div
                                key={`${item?.product?._id || 'missing'}-${item?.selectedColorKey || 'default'}-${index}`}
                                className={cx('productItem')}
                            >
                                <img
                                    className={cx('productImage')}
                                    src={item?.selectedColorImage || item?.product?.images?.[0]}
                                    alt={item?.product?.name}
                                />
                                <div className={cx('productDetails')}>
                                    <h4 className={cx('productName')}>{item?.product?.name}</h4>
                                    {item?.selectedColorName && (
                                        <div className={cx('productMeta')}>
                                            <span className={cx('quantity')}>Màu: {item.selectedColorName}</span>
                                        </div>
                                    )}
                                    <div className={cx('productMeta')}>
                                        <span className={cx('quantity')}>Số lượng: x{item?.quantity}</span>
                                        <span className={cx('price')}>
                                            {Number(item?.price || item?.unitPrice || item?.product?.price || 0).toLocaleString('vi-VN')} đ
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* HÀNG 2: Chia 50 | 50 (Thông tin khách hàng - Tổng quan thanh toán) */}
                <div className={cx('splitRow')}>
                    {/* CỘT TRÁI 50%: Thông tin nhận hàng */}
                    <div className={cx('infoCard')}>
                        <div>
                            <h4 className={cx('cardTitle')}>
                                <UserOutlined /> Thông tin nhận hàng
                            </h4>
                            <div className={cx('infoRow')}>
                                <span className={cx('rowLabel')}>Người nhận:</span>
                                <span className={cx('rowValue')}>{order?.findPayment?.fullName || 'N/A'}</span>
                            </div>
                            <div className={cx('infoRow')}>
                                <span className={cx('rowLabel')}>Số điện thoại:</span>
                                <span className={cx('rowValue')}>
                                    {order?.findPayment?.phone ? `0${order.findPayment.phone}` : 'N/A'}
                                </span>
                            </div>
                            <div className={cx('infoRow')}>
                                <span className={cx('rowLabel')}>Phương thức:</span>
                                <span className={cx('rowValue')}>
                                    <Tag color="blue">{order?.findPayment?.typePayments || 'COD'}</Tag>
                                </span>
                            </div>
                            <div className={cx('infoRow')} style={{ alignItems: 'flex-start' }}>
                                <span className={cx('rowLabel')}>Địa chỉ:</span>
                                <span className={cx('rowValue')} style={{ maxWidth: '65%', wordBreak: 'break-word' }}>
                                    {order?.findPayment?.address || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* CỘT PHẢI 50%: Tổng quan đơn hàng */}
                    <div className={cx('summaryCard')}>
                        <div>
                            <h4 className={cx('cardTitle')}>
                                <CreditCardOutlined /> Tổng quan đơn hàng
                            </h4>

                            {(() => {
                                const findPayment = order?.findPayment;
                                const dataProduct = order?.dataProduct || [];
                                const computedTotal = dataProduct.reduce((sum, item) => {
                                    const price = Number(item?.price ?? item?.unitPrice ?? item?.product?.price ?? 0);
                                    const qty = Number(item?.quantity ?? 1);
                                    return sum + price * qty;
                                }, 0);
                                const rawTotal = Number(findPayment?.totalPriceBeforeDiscount || 0) || computedTotal;
                                const vipRate = Number(findPayment?.vipDiscountRate || 0);
                                const vipAmount = Number(findPayment?.vipDiscountAmount || 0);
                                const couponAmount = Number(findPayment?.discountAmount || 0);
                                const hasVipDiscount = vipRate > 0 && vipAmount > 0;
                                const hasCouponDiscount = couponAmount > 0;

                                const getVipTierInfo = (tier) => {
                                    switch (tier) {
                                        case 'dong':
                                            return { name: 'Đồng', color: '#cd7f32' };
                                        case 'bac':
                                            return { name: 'Bạc', color: '#718096' };
                                        case 'vang':
                                            return { name: 'Vàng', color: '#d69e2e' };
                                        case 'kimcuong':
                                            return { name: 'Kim Cương', color: '#00b5d8' };
                                        default:
                                            return { name: '', color: '#8c8c8c' };
                                    }
                                };

                                const vipInfo = getVipTierInfo(findPayment?.vipTierAtOrder);

                                return (
                                    <>
                                        {rawTotal > 0 && (
                                            <div className={cx('summaryRow')}>
                                                <span className={cx('rowLabel')}>Tổng tiền hàng</span>
                                                <span className={cx('rowValue')}>
                                                    {rawTotal.toLocaleString('vi-VN')} đ
                                                </span>
                                            </div>
                                        )}

                                        {hasVipDiscount && (
                                            <div className={cx('summaryRow', 'vipRow')}>
                                                <span className={cx('rowLabel')}>
                                                    <Tag color={vipInfo.color} icon={<CrownOutlined />}>
                                                        Ưu đãi hạng {vipInfo.name} (-{vipRate}%)
                                                    </Tag>
                                                </span>
                                                <span className={cx('rowValue', 'vipAmount')}>
                                                    - {vipAmount.toLocaleString('vi-VN')} đ
                                                </span>
                                            </div>
                                        )}

                                        {hasCouponDiscount && (
                                            <div className={cx('summaryRow', 'couponRow')}>
                                                <span className={cx('rowLabel')}>
                                                    <Tag color="#ff4d4f" icon={<TagOutlined />}>
                                                        Voucher {findPayment?.couponCode ? `(${findPayment.couponCode})` : ''}
                                                    </Tag>
                                                </span>
                                                <span className={cx('rowValue', 'couponAmount')}>
                                                    - {couponAmount.toLocaleString('vi-VN')} đ
                                                </span>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>

                        <div>
                            <Divider style={{ margin: '12px 0' }} />

                            <div className={cx('summaryRow', 'finalRow')}>
                                <span className={cx('finalLabel')}>Thành tiền</span>
                                <span className={cx('finalValue')}>
                                    {totalPriceAfterDiscount.toLocaleString('vi-VN')} đ
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ModalDetailOrder;
