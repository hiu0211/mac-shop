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
                            <span>Kiểu thanh toán</span>
                            <p>{dataPayment?.findPayment?.typePayments}</p>
                        </div>

                        {dataPayment?.findPayment?.discountAmount > 0 && (
                            <>
                                <div className={cx('list')}>
                                    <span>Tổng tiền hàng</span>
                                    <p>{dataPayment?.findPayment?.totalPriceBeforeDiscount?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</p>
                                </div>

                                <div className={cx('list')}>
                                    <span>Giảm giá</span>
                                    <p>- {dataPayment?.findPayment?.discountAmount?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</p>
                                </div>
                            </>
                        )}

                        <div className={cx('list')}>
                            <span>Thành tiền</span>
                            <p>{totalPriceAfterDiscount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</p>
                        </div>

                        <div className={cx('list__products')}>
                            <ul>
                                {dataPayment?.dataProduct?.map((item, index) => (
                                    <li key={`${item?.product?._id || 'missing'}-${item?.selectedColorKey || 'default'}-${index}`}>
                                        <div id={cx('product')}>
                                            <img src={item?.selectedColorImage || item?.product?.images?.[0]} alt="" />
                                            <h4>{item?.product?.name}</h4>
                                        </div>
                                        {item?.selectedColorName && <p id={cx('price')}>Màu: {item.selectedColorName}</p>}
                                        <p id={cx('price')}>Số lượng : x{item?.quantity} </p>
                                        {/* <p id={cx('price')}>{Number(item?.price || item?.unitPrice || item?.product?.price || 0).toLocaleString()} đ</p> */}
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
