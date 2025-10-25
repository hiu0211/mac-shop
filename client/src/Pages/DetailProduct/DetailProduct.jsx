import classNames from 'classnames/bind';
import styles from './DetailProduct.module.scss';
import Header from '../../Components/Header/Header';
import Footer from '../../Components/Footer/Footer';

import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectFade, Navigation, Pagination, Autoplay } from 'swiper/modules';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { faCheckCircle } from '@fortawesome/free-regular-svg-icons';

import { useEffect, useRef, useState } from 'react';
import { requestAddToCart, requestGetProductById } from '../../Config/request';
import { useParams, useNavigate } from 'react-router-dom';

import { message } from 'antd';

const cx = classNames.bind(styles);

function DetailProduct() {
    const ref = useRef();
    const navigate = useNavigate();

    const { id } = useParams();

    const [dataProduct, setDataProduct] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            const res = await requestGetProductById(id);
            setDataProduct(res.metadata);
        };
        fetchData();
    }, [id]);

    useEffect(() => {
        ref.current.scrollIntoView({ behavior: 'smooth' });
    }, [id]);

    const handleAddToCart = async () => {
        try {
            const data = {
                productId: id,
                quantity: 1,
            };
            await requestAddToCart(data);
            message.success('Thêm vào giỏ hàng thành công');
            return true;
        } catch (error) {
            console.error(error);
            message.error('Sản phẩm đã hết hàng');
            return false;
        }
    };

    const handleBuyNow = async () => {
        const success = await handleAddToCart();
        if (success) {
            navigate('/cart');
        }
    };

    return (
        <div className={cx('wrapper')}>
            <header>
                <Header />
            </header>

            <main className={cx('main')} ref={ref}>
                <div className={cx('inner')}>
                    <div className={cx('swiper')}>
                        <Swiper
                            slidesPerView={1}
                            autoplay={{
                                delay: 2000,
                                disableOnInteraction: false,
                            }}
                            loop={true}
                            speed={1000}
                            spaceBetween={30}
                            effect={'fade'}
                            navigation={true}
                            pagination={{
                                clickable: true,
                            }}
                            modules={[EffectFade, Navigation, Pagination, Autoplay]}
                            className="mySwiper"
                        >
                            {dataProduct?.images?.map((item, index) => (
                                <SwiperSlide key={index}>
                                    <img src={item} />
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>

                    <div className={cx('product-info')}>
                        <h1>{dataProduct?.name}</h1>
                        <div className={cx('price-box')}>
                            <span className={cx('price-text')}>Giá bán:</span>
                            <h2 className={cx('price-money')}>{dataProduct?.price?.toLocaleString()}đ</h2>
                        </div>
                        <ul>
                            <li>
                                <FontAwesomeIcon icon={faCheckCircle} />
                                <span>Hãng Sản Xuất: Iphone</span>
                            </li>
                            <li>
                                <FontAwesomeIcon icon={faCheckCircle} />
                                <span>Giao hàng ngày mở bán tại Việt Nam 27/06/2025</span>
                            </li>
                            <li>
                                <FontAwesomeIcon icon={faCheckCircle} />
                                <span>Sản phẩm chính hãng Apple Việt Nam mới 100% nguyên seal</span>
                            </li>
                            <li>
                                <FontAwesomeIcon icon={faCheckCircle} />
                                <span>Giá đã bao gồm VAT</span>
                            </li>
                            <li>
                                <FontAwesomeIcon icon={faCheckCircle} />
                                <span>Bảo hành 12 tháng chính hãng</span>
                            </li>
                            <li>
                                <FontAwesomeIcon icon={faCheckCircle} />
                                <span>Giảm giá 10% khi mua phụ kiện kèm theo</span>
                            </li>
                        </ul>

                        <div className={cx('button-group')}>
                            <button onClick={handleBuyNow}>Mua ngay</button>
                            <button onClick={handleAddToCart}>Thêm vào giỏ hàng</button>
                        </div>

                        <ul>
                            <li>
                                <FontAwesomeIcon icon={faCheckCircle} />
                                <p> Dùng thử 10 ngày miễn phí đổi máy. </p>
                            </li>
                            <li>
                                <FontAwesomeIcon icon={faCheckCircle} />
                                <p>Lỗi 1 Đổi 1 trong 30 ngày đầu. </p>
                            </li>
                            <li>
                                <FontAwesomeIcon icon={faCheckCircle} />
                                <p>Giao hàng tận nhà toàn quốc</p>
                            </li>
                            <li>
                                <FontAwesomeIcon icon={faCheckCircle} />
                                <p>Thanh toán khi nhận hàng (nội thành)</p>
                            </li>
                            <li>
                                <FontAwesomeIcon icon={faCheckCircle} />
                                <p>Gọi 0936 096 900 để được tư vấn mua hàng (Miễn phí)</p>
                            </li>
                        </ul>

                        <div className={cx('specs')}>
                            <h4>Thông số kỹ thuật</h4>
                            <div>
                                <h5>Bộ xử lý CPU</h5>
                                <p>{dataProduct?.cpu}</p>
                            </div>

                            <div>
                                <h5>Ram</h5>
                                <p>{dataProduct?.ram}</p>
                            </div>

                            <div>
                                <h5>Màn hình</h5>
                                <p>{dataProduct?.screen}</p>
                            </div>
                            <div>
                                <h5>GPU</h5>
                                <p>{dataProduct?.gpu}</p>
                            </div>
                            <div>
                                <h5>Ổ cứng</h5>
                                <p>{dataProduct?.storage}</p>
                            </div>
                            <div>
                                <h5>Kích thước</h5>
                                <p>{dataProduct?.weight}</p>
                            </div>
                            <div>
                                <h5>Camera</h5>
                                <p>{dataProduct?.camera}</p>
                            </div>
                            <div>
                                <h5>Pin</h5>
                                <p>{dataProduct?.battery}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default DetailProduct;