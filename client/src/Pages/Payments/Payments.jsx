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

    useEffect(() => {
        const fetchData = async () => {
            const res = await requestGetOnePayment(id);
            setDataPayment(res.metadata);
        };
        fetchData();
    }, []);

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

                        <div className={cx('list__products')}>
                            <ul>
                                {dataPayment?.dataProduct?.map((item) => (
                                    <li key={item?.product?._id}>
                                        <div id={cx('product')}>
                                            <img src={item?.product.images[0]} alt="" />
                                            <h4>{item?.product?.name}</h4>
                                        </div>
                                        <p id={cx('price')}>Số lượng : x{item?.quantity} </p>
                                        <p id={cx('price')}>{item?.product?.price.toLocaleString()} đ</p>
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
