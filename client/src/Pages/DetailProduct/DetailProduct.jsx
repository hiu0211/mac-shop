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
import cookies from 'js-cookie';

import { Empty, Rate, message } from 'antd';

const cx = classNames.bind(styles);

const LEGACY_SPEC_FIELDS = [
    { key: 'cpu', label: 'Bộ xử lý CPU' },
    { key: 'ram', label: 'Ram' },
    { key: 'screen', label: 'Màn hình' },
    { key: 'gpu', label: 'GPU' },
    { key: 'storage', label: 'Ổ cứng' },
    { key: 'weight', label: 'Kích thước' },
    { key: 'camera', label: 'Camera' },
    { key: 'battery', label: 'Pin' },
];

const normalizeAttributes = (attributes) => {
    if (!attributes) {
        return {};
    }

    if (typeof attributes === 'string') {
        try {
            const parsed = JSON.parse(attributes);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
            return {};
        }
    }

    if (typeof attributes === 'object' && !Array.isArray(attributes)) {
        return { ...attributes };
    }

    return {};
};

const formatSpecLabel = (key) => {
    return String(key || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

const buildSpecs = (product = {}) => {
    const dynamicAttributes = normalizeAttributes(product.attributes);
    const dynamicEntries = Object.entries(dynamicAttributes).filter(([, value]) => value != null && String(value).trim() !== '');

    if (dynamicEntries.length > 0) {
        return dynamicEntries.map(([key, value]) => ({
            label: formatSpecLabel(key),
            value,
        }));
    }

    return LEGACY_SPEC_FIELDS.filter((field) => product[field.key] != null && String(product[field.key]).trim() !== '').map((field) => ({
        label: field.label,
        value: product[field.key],
    }));
};

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
        const token = cookies.get('logged');
        if (!token) {
            navigate('/login');
            return false;
        }
        try {
            const data = {
                productId: id,
                quantity: 1,
            };
            await requestAddToCart(data);
            window.dispatchEvent(new Event('cart-updated'));
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

    const reviews = Array.isArray(dataProduct?.reviews) ? dataProduct.reviews : [];
    const averageRating =
        reviews.length > 0 ? reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / reviews.length : 0;
    const specs = buildSpecs(dataProduct);

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
                                <span>Hãng sản xuất: {dataProduct?.brand || 'Đang cập nhật'}</span>
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
                            {specs.map((item) => (
                                <div key={item.label}>
                                    <h5>{item.label}</h5>
                                    <p>{item.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className={cx('reviews')}>
                            <div className={cx('reviewsHeader')}>
                                <h4>Đánh giá khách hàng</h4>
                                {reviews.length > 0 && (
                                    <div className={cx('ratingOverview')}>
                                        <Rate disabled allowHalf value={Number(averageRating.toFixed(1))} />
                                        <span>
                                            {averageRating.toFixed(1)}/5 ({reviews.length} đánh giá)
                                        </span>
                                    </div>
                                )}
                            </div>

                            {reviews.length === 0 ? (
                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có đánh giá nào" />
                            ) : (
                                <div className={cx('reviewList')}>
                                    {[...reviews]
                                        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                        .map((review, index) => (
                                            <div key={`${review.userId}-${review.createdAt}-${index}`} className={cx('reviewItem')}>
                                                <div className={cx('reviewTop')}>
                                                    <strong>{review.fullName || 'Khách hàng'}</strong>
                                                    <span>{new Date(review.createdAt).toLocaleDateString('vi-VN')}</span>
                                                </div>
                                                <Rate disabled value={review.rating} />
                                                {review.comment && <p>{review.comment}</p>}
                                                {Array.isArray(review.images) && review.images.length > 0 && (
                                                    <div className={cx('reviewImages')}>
                                                        {review.images.map((img, imgIndex) => (
                                                            <img key={`${img}-${imgIndex}`} src={img} alt="review" />
                                                        ))}
                                                    </div>
                                                )}
                                                {review.adminReply?.message && (
                                                    <div className={cx('adminReply')}>
                                                        <strong>{review.adminReply.adminName || 'Quản trị viên'}</strong>
                                                        <span>
                                                            {review.adminReply.repliedAt
                                                                ? new Date(review.adminReply.repliedAt).toLocaleDateString('vi-VN')
                                                                : ''}
                                                        </span>
                                                        <p>{review.adminReply.message}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            )}
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