import classNames from 'classnames/bind';
import styles from './ProductsHome.module.scss';
import CardBody from '../../CardBody/CardBody';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { requestGetProducts } from '../../../Config/request';
const cx = classNames.bind(styles);

function ProductsHome() {
    const [products, setProducts] = useState([]);
    useEffect(() => {
        const fetchData = async () => {
            const res = await requestGetProducts(8);
            setProducts(res.metadata);
        };
        fetchData();
    }, []);

    return (
        <div className={cx('wrapper')}>
            <div className={cx('inner')}>
                <div className={cx('title')}>
                    <h2>Sản phẩm nổi bật</h2>
                </div>
                <div className={cx('card-body')}>
                    {products.map((item) => (
                        <CardBody key={item._id} item={item} />
                    ))}
                </div>

                <div className={cx('button-group')}>
                    <Link to="/category">
                        <button>Xem tất cả</button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default ProductsHome;
