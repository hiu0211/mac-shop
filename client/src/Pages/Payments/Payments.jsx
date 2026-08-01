import classNames from 'classnames/bind';
import styles from './Payments.module.scss';

import Header from '../../Components/Header/Header';

import imgSuccess from '../../assets/images/success.gif';
import { useParams } from 'react-router-dom';
import { requestGetOnePayment } from '../../Config/request';
import { useEffect, useState } from 'react';

const cx = classNames.bind(styles);

function Payments() {
    const [dataPayment, setDataPayment] = useState({});

    const { id } = useParams();
    const totalPriceAfterDiscount = Number(
        dataPayment?.findPayment?.totalPriceAfterDiscount ?? dataPayment?.findPayment?.totalPrice ?? 0,
    );

    useEffect(() => {
        const fetchData = async () => {
            const res = await requestGetOnePayment(id);
            setDataPayment(res.metadata);
        };
        fetchData();
    }, [id]);

    return (
        <div>
            <header>
                <Header />
            </header>

            <main className={cx('main-content')}>
                <div className={cx('inner')}>
                    <div className={cx('success')}>
                        <img src={imgSuccess} alt="..." />
                        <h3>Cảm ơn bạn đã mua hàng tại MAC-ONE</h3>
                        <p>
                            Thanh toán thành công, hệ thống gửi xác nhận và biên lai ngay lập tức. Quá trình nhanh gọn,
                            khách hàng hoàn toàn yên tâm.
                        </p>

                        <div className={cx('list')}>
                            <span>Người nhận</span>
                            <p>{dataPayment?.findPayment?.fullName}</p>
                        </div>

                        <div className={cx('list')}>
                            <span>Địa chỉ</span>
                            <p>{dataPayment?.findPayment?.address}</p>
                        </div>

                        <div className={cx('list')}>
                            <span>Số điện thoại</span>
                            <p>0{dataPayment?.findPayment?.phone}</p>
                        </div>

                        <div className={cx('list')}>
                            <span>Email</span>
                            <p>{dataPayment?.findPayment?.email || 'N/A'}</p>
                        </div>

                        <div className={cx('list')}>
                            <span>Phương thức thanh toán</span>
                            <p>{dataPayment?.findPayment?.typePayments}</p>
                        </div>

                        {(() => {
                            const findPayment = dataPayment?.findPayment;
                            const dataProduct = dataPayment?.dataProduct || [];
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

                            const getVipTierName = (tier) => {
                                switch (tier) {
                                    case 'dong':
                                        return 'Đồng';
                                    case 'bac':
                                        return 'Bạc';
                                    case 'vang':
                                        return 'Vàng';
                                    case 'kimcuong':
                                        return 'Kim Cương';
                                    default:
                                        return '';
                                }
                            };

                            const vipTierName = getVipTierName(findPayment?.vipTierAtOrder);

                            return (
                                <>
                                    {rawTotal > 0 && (hasVipDiscount || hasCouponDiscount) && (
                                        <div className={cx('list')}>
                                            <span>Tổng tiền hàng</span>
                                            <p>{rawTotal.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</p>
                                        </div>
                                    )}

                                    {hasVipDiscount && (
                                        <div className={cx('list')}>
                                            <span>Ưu đãi hạng {vipTierName} ( - {vipRate}%)</span>
                                            <p style={{ color: '#d69e2e' }}>
                                                - {vipAmount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                                            </p>
                                        </div>
                                    )}

                                    {hasCouponDiscount && (
                                        <div className={cx('list')}>
                                            <span>
                                                Giảm giá Voucher {findPayment?.couponCode ? `(${findPayment.couponCode})` : ''}
                                            </span>
                                            <p style={{ color: '#e53935' }}>
                                                - {couponAmount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                                            </p>
                                        </div>
                                    )}
                                </>
                            );
                        })()}

                        <div className={cx('list')}>
                            <span>Thành tiền</span>
                            <p>{totalPriceAfterDiscount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</p>
                        </div>

                        <div className={cx('list__products')}>
                            <h4 className={cx('productsTitle')}>Sản phẩm đã đặt</h4>
                            <ul>
                                {dataPayment?.dataProduct?.map((item, index) => (
                                    <li key={`${item?.product?._id || 'missing'}-${item?.selectedColorKey || 'default'}-${index}`}>
                                        <div className={cx('productInfo')}>
                                            <img src={item?.selectedColorImage || item?.product?.images?.[0]} alt="" />
                                            <div className={cx('productMeta')}>
                                                <h4 className={cx('productName')}>{item?.product?.name}</h4>
                                                {item?.selectedColorName && <span className={cx('colorText')}>Màu: {item.selectedColorName}</span>}
                                            </div>
                                        </div>

                                        <div className={cx('priceQuantityBox')}>
                                            <p className={cx('productPrice')}>
                                                {Number(item?.price || item?.unitPrice || item?.product?.price || 0).toLocaleString('vi-VN')} đ
                                            </p>
                                            <p className={cx('productQty')}>Số lượng : x{item?.quantity}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Payments;
