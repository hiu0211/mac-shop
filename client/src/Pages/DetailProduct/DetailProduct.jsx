import classNames from 'classnames/bind';
import styles from './DetailProduct.module.scss';
import Header from '../../Components/Header/Header';
import Footer from '../../Components/Footer/Footer';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { faCheckCircle, faShieldHalved, faTruckFast, faRotateLeft, faPhoneVolume, faCheck } from '@fortawesome/free-solid-svg-icons';

import { useEffect, useMemo, useRef, useState } from 'react';
import { requestAddToCart, requestGetProductById } from '../../Config/request';
import { useParams, useNavigate } from 'react-router-dom';

import { Empty, Rate, message } from 'antd';

const cx = classNames.bind(styles);

const normalizeAttributes = (attributes) => {
    if (!attributes) return {};
    if (typeof attributes === 'string') {
        try {
            const parsed = JSON.parse(attributes);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch { return {}; }
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

const normalizeSpecifications = (specifications) => {
    if (!Array.isArray(specifications)) return [];
    return specifications
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({
            key: String(item.key || item.label || '').trim(),
            label: String(item.label || item.key || '').trim(),
            value: item.value,
        }))
        .filter((item) => item.label && item.value != null && String(item.value).trim() !== '');
};

const buildSpecs = (product = {}) => {
    const normalizedSpecs = normalizeSpecifications(product.specifications);
    if (normalizedSpecs.length > 0) return normalizedSpecs;

    const dynamicAttributes = normalizeAttributes(product.attributes);
    const dynamicEntries = Object.entries(dynamicAttributes).filter(([, value]) => value != null && String(value).trim() !== '');

    if (dynamicEntries.length > 0) {
        return dynamicEntries.map(([key, value]) => ({
            key,
            label: formatSpecLabel(key),
            value,
        }));
    }

    return [];
};

const clampDiscountPercent = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.min(Math.max(Math.round(numeric), 0), 100);
};

const normalizeColorOptions = (colorOptions) => {
    if (!Array.isArray(colorOptions)) return [];

    return colorOptions
        .filter((item) => item && typeof item === 'object')
        .map((item, index) => {
            const name = String(item.name || '').trim();
            const key = String(item.key || name || `color-${index + 1}`).trim().toLowerCase();
            const image = String(item.image || '').trim();
            const price = Number(item.price);

            if (!name || !key || !Number.isFinite(price) || price < 0) {
                return null;
            }

            return {
                key,
                name,
                image,
                price,
                isDefault: Boolean(item.isDefault),
            };
        })
        .filter(Boolean);
};

const resolveInitialColorKey = (product = {}, colorOptions = []) => {
    if (!Array.isArray(colorOptions) || colorOptions.length === 0) return '';

    const normalizedDefaultColorKey = String(product?.defaultColorKey || '').trim().toLowerCase();
    if (normalizedDefaultColorKey && colorOptions.some((item) => item.key === normalizedDefaultColorKey)) {
        return normalizedDefaultColorKey;
    }

    const defaultOption = colorOptions.find((item) => item.isDefault);
    return defaultOption?.key || colorOptions[0]?.key || '';
};

const buildPricingData = (product = {}, selectedColorOption = null) => {
    const originalPrice = selectedColorOption ? Number(selectedColorOption.price || 0) : Number(product?.price) || 0;
    
    if (product?.flashSale) {
        const discountedPrice = Number(product.flashSale.flashSalePrice) || 0;
        const discountPercent = originalPrice > 0 ? Math.max(0, Math.round(((originalPrice - discountedPrice) / originalPrice) * 100)) : 0;
        return {
            originalPrice,
            discountPercent,
            hasDiscount: true,
            discountedPrice,
            savingAmount: Math.max(0, originalPrice - discountedPrice),
            isFlashSale: true
        };
    }

    const discountPercent = clampDiscountPercent(product?.discount);
    const hasDiscount = originalPrice > 0 && discountPercent > 0;
    const discountedPrice = hasDiscount
        ? Math.max(0, Math.round((originalPrice * (100 - discountPercent)) / 100))
        : originalPrice;

    return {
        originalPrice,
        discountPercent,
        hasDiscount,
        discountedPrice,
        savingAmount: Math.max(0, originalPrice - discountedPrice),
        isFlashSale: false
    };
};

const formatCurrency = (value) => Number(value || 0).toLocaleString('vi-VN');

function DetailProduct() {
    const ref = useRef();
    const navigate = useNavigate();
    const { id } = useParams();
    const [dataProduct, setDataProduct] = useState({});
    const [selectedColorKey, setSelectedColorKey] = useState('');
    const [flashSaleTimeLeft, setFlashSaleTimeLeft] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            const res = await requestGetProductById(id);
            const nextProduct = res?.metadata || {};
            setDataProduct(nextProduct);

            const nextColorOptions = normalizeColorOptions(nextProduct?.colorOptions);
            setSelectedColorKey(resolveInitialColorKey(nextProduct, nextColorOptions));
        };
        fetchData();
    }, [id]);

    useEffect(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth' });
    }, [id]);

    useEffect(() => {
        if (!dataProduct?.flashSale?.endDate) return;

        const updateTimer = () => {
            const now = new Date().getTime();
            const target = new Date(dataProduct.flashSale.endDate).getTime();
            const difference = target - now;

            if (difference <= 0) {
                setFlashSaleTimeLeft('Đã kết thúc');
                return;
            }

            const hrs = Math.floor(difference / (1000 * 60 * 60));
            const mins = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((difference % (1000 * 60)) / 1000);

            setFlashSaleTimeLeft(
                `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
            );
        };

        updateTimer();
        const intervalId = setInterval(updateTimer, 1000);
        return () => clearInterval(intervalId);
    }, [dataProduct?.flashSale]);

    const handleAddToCart = async () => {
        const availableColorOptions = normalizeColorOptions(dataProduct?.colorOptions);
        if (availableColorOptions.length > 0 && !selectedColorKey) {
            message.warning('Vui lòng chọn màu sắc trước khi thêm vào giỏ');
            return false;
        }

        try {
            const data = {
                productId: id,
                quantity: 1,
                selectedColorKey: selectedColorKey || undefined,
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
    const averageRating = reviews.length > 0 ? reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / reviews.length : 0;
    const specs = buildSpecs(dataProduct);
    const colorOptions = normalizeColorOptions(dataProduct?.colorOptions);
    const selectedColorOption = colorOptions.find((item) => item.key === selectedColorKey) || null;
    const displayImages = useMemo(() => {
        const productImages = Array.isArray(dataProduct?.images)
            ? dataProduct.images.map((item) => String(item || '').trim()).filter(Boolean)
            : [];

        const selectedColorImage = String(selectedColorOption?.image || '').trim();
        if (!selectedColorImage) {
            return productImages;
        }

        const remainingImages = productImages.filter((item) => item !== selectedColorImage);
        return [selectedColorImage, ...remainingImages];
    }, [dataProduct?.images, selectedColorOption?.image]);
    const {
        originalPrice,
        hasDiscount,
        discountedPrice,
        savingAmount,
    } = buildPricingData(dataProduct, selectedColorOption);

    return (
        <div className={cx('wrapper')}>
            <Header />

            <main className={cx('main')} ref={ref}>
                <div className={cx('inner')}>
                    <div className={cx('leftColumn')}>
                        <div className={cx('swiperWrapper')}>
                            <Swiper
                                key={`gallery-${id}-${selectedColorKey || 'default'}`}
                                slidesPerView={1}
                                autoplay={{ delay: 3000, disableOnInteraction: false }}
                                loop={true}
                                speed={800}
                                spaceBetween={30}
                                navigation={true}
                                pagination={{ clickable: true }}
                                modules={[Navigation, Pagination, Autoplay]}
                                className="mySwiper"
                            >
                                {displayImages.map((item, index) => (
                                    <SwiperSlide key={index}>
                                        <div className={cx('imageContainer')}>
                                            <img src={item} alt={`${dataProduct?.name} - Image ${index + 1}`} />
                                        </div>
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </div>
                    </div>

                    <div className={cx('rightColumn')}>
                        <div className={cx('productHeader')}>
                            <h1>{dataProduct?.name}</h1>
                        </div>

                        {dataProduct?.flashSale && (
                            <div className={cx('flashSaleDetailBanner')}>
                                <div className={cx('flashSaleLeft')}>
                                    <span className={cx('lightningIcon')}>⚡</span>
                                    <span>FLASH SALE ĐANG DIỄN RA</span>
                                </div>
                                <div className={cx('flashSaleRight')}>
                                    <span className={cx('timerLabel')}>Kết thúc sau:</span>
                                    <span className={cx('timerValue')}>{flashSaleTimeLeft}</span>
                                </div>
                            </div>
                        )}

                        <div className={cx('priceBox')}>
                            {hasDiscount ? (
                                <div className={cx('priceBanner')}>
                                    <div className={cx('bannerSaleValue')}>
                                        {formatCurrency(discountedPrice)}<sup><u>đ</u></sup>
                                    </div>
                                    <div className={cx('bannerBaseValue')}>
                                        <span className={cx('strikeThrough')}>{formatCurrency(originalPrice)}</span>
                                        <sup><u>VNĐ</u></sup>
                                    </div>
                                    <div className={cx('bannerSaving')}>
                                        Tiết kiệm: {formatCurrency(savingAmount)} <u>VNĐ</u>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <span className={cx('priceLabel')}>Giá chính thức:</span>
                                    <h2 className={cx('priceValue')}>{formatCurrency(originalPrice)}đ</h2>
                                </>
                            )}
                            <span className={cx('vatBadge')}>Đã bao gồm VAT</span>
                        </div>

                        {colorOptions.length > 0 && (
                            <div className={cx('colorSection')}>
                                <h3>Chọn màu sắc</h3>
                                <div className={cx('colorList')}>
                                    {colorOptions.map((option) => {
                                        const isActive = selectedColorKey === option.key;
                                        const optionDisplayPrice = buildPricingData(dataProduct, option).discountedPrice;
                                        return (
                                            <button
                                                key={option.key}
                                                type="button"
                                                className={cx('colorOption', { colorOptionActive: isActive })}
                                                onClick={() => setSelectedColorKey(option.key)}
                                            >
                                                {option.image ? (
                                                    <img
                                                        className={cx('colorPreviewImage')}
                                                        src={option.image}
                                                        alt={option.name}
                                                    />
                                                ) : (
                                                    <span className={cx('colorPreviewImagePlaceholder')} aria-hidden="true" />
                                                )}

                                                <span className={cx('colorMeta')}>
                                                    <span className={cx('colorLabel')}>{option.name}</span>
                                                    <span className={cx('colorPrice')}>{formatCurrency(optionDisplayPrice)}đ</span>
                                                </span>

                                                {isActive && (
                                                    <span className={cx('colorTick')}>
                                                        <FontAwesomeIcon icon={faCheck} />
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className={cx('promoBox')}>
                            <h3 className={cx('boxTitle')}>Ưu đãi dành cho bạn</h3>
                            <ul>
                                <li><FontAwesomeIcon icon={faCheckCircle} /> Hãng sản xuất: <strong>{dataProduct?.brand || 'Đang cập nhật'}</strong></li>
                                <li><FontAwesomeIcon icon={faCheckCircle} /> Sản phẩm chính hãng Việt Nam mới 100% nguyên seal</li>
                                <li><FontAwesomeIcon icon={faCheckCircle} /> Giao hàng ngày mở bán tại Việt Nam 27/06/2025</li>
                                <li><FontAwesomeIcon icon={faCheckCircle} /> <strong>Giảm thêm 10%</strong> khi mua kèm phụ kiện chính hãng</li>
                            </ul>
                        </div>

                        <div className={cx('actionButtons')}>
                            <button className={cx('btnBuyNow')} onClick={handleBuyNow}>
                                <strong>MUA NGAY</strong>
                                <span>Giao hàng tận nơi miễn phí</span>
                            </button>
                            <button className={cx('btnAddCart')} onClick={handleAddToCart}>
                                <strong>THÊM VÀO GIỎ</strong>
                                <span>Mua tiếp sản phẩm khác</span>
                            </button>
                        </div>

                        <div className={cx('policyBox')}>
                            <ul>
                                <li><FontAwesomeIcon icon={faRotateLeft} /> Dùng thử 10 ngày miễn phí đổi máy.</li>
                                <li><FontAwesomeIcon icon={faShieldHalved} /> Lỗi 1 Đổi 1 trong 30 ngày đầu. Bảo hành 12 tháng chính hãng.</li>
                                <li><FontAwesomeIcon icon={faTruckFast} /> Giao hàng tận nhà toàn quốc. Thanh toán khi nhận hàng.</li>
                                <li><FontAwesomeIcon icon={faPhoneVolume} /> Gọi <strong>0936 096 900</strong> để được tư vấn (Miễn phí).</li>
                            </ul>
                        </div>

                        {specs.length > 0 && (
                            <div className={cx('specsBox')}>
                                <h4>Thông số kỹ thuật</h4>
                                <ul className={cx('specsList')}>
                                    {specs.map((item, index) => (
                                        <li key={item.key || item.label} className={cx({ striped: index % 2 !== 0 })}>
                                            <span className={cx('specLabel')}>{item.label}</span>
                                            <span className={cx('specValue')}>{item.value}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className={cx('reviewsBox')}>
                            <div className={cx('reviewsHeader')}>
                                <h4>Đánh giá khách hàng</h4>
                                {reviews.length > 0 && (
                                    <div className={cx('ratingOverview')}>
                                        <h2>
                                            {averageRating.toFixed(1)}
                                            <span className={cx('maxRating')}>/5</span>
                                        </h2>
                                        <div className={cx('stars')}>
                                            <Rate disabled allowHalf value={Number(averageRating.toFixed(1))} />
                                            <span>{reviews.length} lượt đánh giá</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {reviews.length === 0 ? (
                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có đánh giá nào cho sản phẩm này" />
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
                                                <Rate disabled value={review.rating} style={{ fontSize: 12 }} />
                                                {review.comment && <p className={cx('reviewComment')}>{review.comment}</p>}
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
                                                        <span className={cx('replyDate')}>
                                                            {review.adminReply.repliedAt ? new Date(review.adminReply.repliedAt).toLocaleDateString('vi-VN') : ''}
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

            <Footer />
        </div>
    );
}

export default DetailProduct;