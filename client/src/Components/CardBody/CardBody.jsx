import classNames from 'classnames/bind';
import styles from './CardBody.module.scss';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../hooks/useStore';

import { Heart } from 'lucide-react';

const cx = classNames.bind(styles);

const toPriceNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const buildPricing = (product = {}) => {
    const originalPrice = toPriceNumber(product?.price);
    const rawDiscount = Number(product?.discount);
    const discountPercent = Number.isFinite(rawDiscount)
        ? Math.min(Math.max(Math.round(rawDiscount), 0), 100)
        : 0;

    const hasDiscount = originalPrice > 0 && discountPercent > 0;
    const discountedPrice = hasDiscount
        ? Math.max(0, Math.round((originalPrice * (100 - discountPercent)) / 100))
        : originalPrice;

    return {
        originalPrice,
        discountPercent,
        hasDiscount,
        discountedPrice,
    };
};

const formatPrice = (value) => Number(value || 0).toLocaleString('vi-VN');

function WishlistButton({ itemId }) {
    const { toggleWishlist, isWishlisted, dataUser } = useStore();
    const navigate = useNavigate();

    const active = isWishlisted(itemId);

    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!dataUser || !dataUser._id) {
            navigate('/login');
            return;
        }
        toggleWishlist(itemId);
    };

    return (
        <button
            type="button"
            className={cx('wishlist', { active })}
            onClick={handleClick}
            aria-pressed={active}
            aria-label={active ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
        >
            <Heart size={20} fill={active ? '#E53935' : 'transparent'} color={active ? '#E53935' : '#666'} />
            <span>Yêu thích</span>
        </button>
    );
}

function CardBody({ item, checkSelectCompare, handleCompare }) {
    if (!item) {
        return <div className={cx('wrapper')}>Loading...</div>;
    }

    const {
        originalPrice,
        discountPercent,
        hasDiscount,
        discountedPrice,
    } = buildPricing(item);

    return (
        <div className={cx('wrapper')}>
            {hasDiscount && <span className={cx('discountBadge')}>-{discountPercent}%</span>}
            {checkSelectCompare && (
                <button onClick={() => handleCompare(item._id)} className={cx('compare')}>
                    So sánh
                </button>
            )}
            <Link to={`/product/${item._id}`}>
                <img src={item?.images?.[0]} alt="" />
            </Link>
            <div className={cx('content')}>
                <h4>{item?.name}</h4>
                <div className={cx('price')}>
                    {hasDiscount ? (
                        <>
                            <p className={cx('priceNew')}>{formatPrice(discountedPrice)}đ</p>
                            <p className={cx('priceOld')}>{formatPrice(originalPrice)} VNĐ</p>
                        </>
                    ) : (
                        <p className={cx('priceNormal')}>{formatPrice(originalPrice)}đ</p>
                    )}
                </div>
                {/* wishlist button */}
                <WishlistButton itemId={item._id} />
            </div>
        </div>
    );
}

export default CardBody;

