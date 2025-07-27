import classNames from 'classnames/bind';
import styles from './CardBody.module.scss';
import { Link } from 'react-router-dom';

const cx = classNames.bind(styles);

function CardBody({ item, checkSelectCompare, handleCompare }) {
    if (!item) {
        return <div className={cx('wrapper')}>Loading...</div>;
    }

    return (
        <div className={cx('wrapper')}>
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
                    {item?.priceDiscount > 0 ? (
                        <>
                            {/* <p className={cx('price-old')}>{item?.price?.toLocaleString()}đ</p>
                            <p className={cx('price-new')}>{item?.priceDiscount?.toLocaleString()}đ</p> */}
                            <p className={cx('price-demo')}>{item?.price?.toLocaleString()}đ</p>
                        </>
                    ) : (
                        <p>{item?.price?.toLocaleString()}đ</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CardBody;
