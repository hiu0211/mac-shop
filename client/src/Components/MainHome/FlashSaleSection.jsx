import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import { ThunderboltFilled, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { requestGetActiveFlashSales } from '../../Config/request';
import styles from './FlashSaleSection.module.scss';

const cx = classNames.bind(styles);

const formatPrice = (value) => Number(value || 0).toLocaleString('vi-VN');
const ITEMS_PER_PAGE = 4;

function FlashSaleSection() {
    const [activeSales, setActiveSales] = useState([]);
    const [timeLeft, setTimeLeft] = useState({ hours: '00', minutes: '00', seconds: '00' });
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);

    const fetchActiveSales = async () => {
        try {
            const res = await requestGetActiveFlashSales();
            setActiveSales(res.metadata || []);
            setCurrentPage(0);
        } catch (error) {
            console.error('Lỗi khi lấy danh sách Flash Sale hoạt động:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActiveSales();
    }, []);

    useEffect(() => {
        if (activeSales.length === 0) return;

        const endTimes = activeSales.map(sale => new Date(sale.endDate).getTime());
        const targetTime = Math.min(...endTimes);

        const updateTimer = () => {
            const now = new Date().getTime();
            const difference = targetTime - now;

            if (difference <= 0) {
                setTimeLeft({ hours: '00', minutes: '00', seconds: '00' });
                fetchActiveSales();
                return;
            }

            const hrs = Math.floor(difference / (1000 * 60 * 60));
            const mins = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((difference % (1000 * 60)) / 1000);

            setTimeLeft({
                hours: String(hrs).padStart(2, '0'),
                minutes: String(mins).padStart(2, '0'),
                seconds: String(secs).padStart(2, '0'),
            });
        };

        updateTimer();
        const intervalId = setInterval(updateTimer, 1000);
        return () => clearInterval(intervalId);
    }, [activeSales]);

    if (loading || activeSales.length === 0) return null;

    const totalPages = Math.ceil(activeSales.length / ITEMS_PER_PAGE);
    const visibleSales = activeSales.slice(
        currentPage * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE + ITEMS_PER_PAGE
    );

    return (
        <div className={cx('wrapper')}>
            <div className={cx('header')}>
                <div className={cx('title')}>
                    <ThunderboltFilled className={cx('lightning-icon')} />
                    <h2>FLASH SALE</h2>
                </div>
                <div className={cx('countdown')}>
                    <span className={cx('countdown-label')}>KẾT THÚC SAU</span>
                    <span className={cx('time-box')}>{timeLeft.hours}</span>
                    <span className={cx('colon')}>:</span>
                    <span className={cx('time-box')}>{timeLeft.minutes}</span>
                    <span className={cx('colon')}>:</span>
                    <span className={cx('time-box')}>{timeLeft.seconds}</span>
                </div>
            </div>

            <div className={cx('inner')}>
                <div className={cx('carousel')}>
                    {/* Nút trái */}
                    <button
                        className={cx('nav-btn', 'nav-btn--left', { disabled: currentPage === 0 })}
                        onClick={() => setCurrentPage(p => p - 1)}
                        disabled={currentPage === 0}
                    >
                        <LeftOutlined />
                    </button>

                    {/* Grid sản phẩm */}
                    <div className={cx('card-grid')}>
                        {visibleSales.map((sale) => {
                            const product = sale.product;
                            if (!product) return null;

                            const originalPrice = product.price || 0;
                            const flashSalePrice = sale.flashSalePrice || 0;
                            const discountPercent = Math.max(0, Math.round(((originalPrice - flashSalePrice) / originalPrice) * 100));
                            const soldPercentage = Math.min(100, Math.round((sale.soldQuantity / sale.quantity) * 100));

                            return (
                                <div key={sale._id} className={cx('product-card')}>
                                    <span className={cx('discount-badge')}>-{discountPercent}%</span>

                                    <Link to={`/product/${product._id}`} className={cx('image-link')}>
                                        <img src={product.images?.[0]} alt={product.name} />
                                    </Link>

                                    <div className={cx('card-content')}>
                                        <h4>{product.name}</h4>

                                        <div className={cx('price-container')}>
                                            <span className={cx('price-new')}>{formatPrice(flashSalePrice)}đ</span>
                                            <span className={cx('price-old')}>{formatPrice(originalPrice)}đ</span>
                                        </div>

                                        <div className={cx('progress-container')}>
                                            <div
                                                className={cx('progress-bar')}
                                                style={{
                                                    width: `${soldPercentage === 0 ? 100 : soldPercentage}%`,
                                                    background: soldPercentage === 0 ? '#ffe8e6' : ''
                                                }}
                                            />
                                            <span className={cx('progress-text')}>
                                                {sale.soldQuantity >= sale.quantity
                                                    ? '🔥 ĐÃ BÁN HẾT'
                                                    : sale.soldQuantity === 0
                                                        ? '🔥 VỪA MỞ BÁN'
                                                        : `🔥 Đã bán ${sale.soldQuantity}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Nút phải */}
                    <button
                        className={cx('nav-btn', { disabled: currentPage === totalPages - 1 })}
                        onClick={() => setCurrentPage(p => p + 1)}
                        disabled={currentPage === totalPages - 1}
                    >
                        <RightOutlined />
                    </button>
                </div>

                {/* Dot indicator — chỉ hiện khi có nhiều hơn 1 trang */}
                {totalPages > 1 && (
                    <div className={cx('dots')}>
                        {Array.from({ length: totalPages }).map((_, i) => (
                            <span
                                key={i}
                                className={cx('dot', { active: i === currentPage })}
                                onClick={() => setCurrentPage(i)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default FlashSaleSection;