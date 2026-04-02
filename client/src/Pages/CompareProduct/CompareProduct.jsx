import classNames from 'classnames/bind';
import styles from './CompareProduct.module.scss';
import Header from '../../Components/Header/Header';
import CardBody from '../../Components/CardBody/CardBody';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { faCheckCircle } from '@fortawesome/free-regular-svg-icons';
import { useParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { requestGetProductById, requestCompareProduct } from '../../Config/request';

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

function CompareProduct() {
    const { id1, id2 } = useParams();
    const [product1, setProduct1] = useState({});
    const [product2, setProduct2] = useState({});
    const [compare, setCompare] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const compareRef = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            const res = await requestGetProductById(id1);
            setProduct1(res.metadata);
            const res2 = await requestGetProductById(id2);
            setProduct2(res2.metadata);
        };
        fetchData();
        compareRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [id1, id2]);

    const product1Specs = buildSpecs(product1);
    const product2Specs = buildSpecs(product2);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const res = await requestCompareProduct(id1, id2);
                setCompare(res);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id1, id2]);

    return (
        <div className={cx('wrapper')}>
            <header>
                <Header />
            </header>

            <main className={cx('main')}>
                <div className={cx('inner')}>
                    <div>
                        <div className={cx('product-info')}>
                            <h1>{product1?.name}</h1>
                            <p>{product1?.price?.toLocaleString()} đ</p>
                            <ul>
                                <li>
                                    <FontAwesomeIcon icon={faCheckCircle} />
                                    <span>Hãng sản xuất: {product1?.brand || 'Đang cập nhật'}</span>
                                </li>
                                <li>
                                    <FontAwesomeIcon icon={faCheckCircle} />
                                    <span>Giao hàng ngày mở bán tại Việt Nam 20/05/2025</span>
                                </li>
                                <li>
                                    <FontAwesomeIcon icon={faCheckCircle} />
                                    <span>Sản phẩm chính hãng Việt Nam mới 100% nguyên seal</span>
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

                            <ul>
                                <li>
                                    <FontAwesomeIcon icon={faCheckCircle} />
                                    <p> Dùng thử 10 ngày miễn phí đổi máy. (MacBook Like New)</p>
                                </li>
                                <li>
                                    <FontAwesomeIcon icon={faCheckCircle} />
                                    <p>Lỗi 1 Đổi 1 trong 30 ngày đầu. (MacBook Like New)</p>
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
                                {product1Specs.map((item) => (
                                    <div key={`product1-${item.label}`}>
                                        <h5>{item.label}</h5>
                                        <p>{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className={cx('product-info')}>
                            <h1>{product2?.name}</h1>
                            <p>{product2?.price?.toLocaleString()} đ</p>
                            <ul>
                                <li>
                                    <FontAwesomeIcon icon={faCheckCircle} />
                                    <span>Hãng sản xuất: {product2?.brand || 'Đang cập nhật'}</span>
                                </li>
                                <li>
                                    <FontAwesomeIcon icon={faCheckCircle} />
                                    <span>Giao hàng ngày mở bán tại Việt Nam 20/05/2025</span>
                                </li>
                                <li>
                                    <FontAwesomeIcon icon={faCheckCircle} />
                                    <span>Sản phẩm chính hãng Việt Nam mới 100% nguyên seal</span>
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

                            <ul>
                                <li>
                                    <FontAwesomeIcon icon={faCheckCircle} />
                                    <p> Dùng thử 10 ngày miễn phí đổi máy. (MacBook Like New)</p>
                                </li>
                                <li>
                                    <FontAwesomeIcon icon={faCheckCircle} />
                                    <p>Lỗi 1 Đổi 1 trong 30 ngày đầu. (MacBook Like New)</p>
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
                                {product2Specs.map((item) => (
                                    <div key={`product2-${item.label}`}>
                                        <h5>{item.label}</h5>
                                        <p>{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={cx('compare-list')} ref={compareRef}>
                    <div className={cx('container')}>
                        <div className={cx('response')}>
                            {isLoading ? (
                                <div className={cx('loading-container')}>
                                    <div className={cx('loading-animation')}>
                                        <div className={cx('phone-1')}></div>
                                        <div className={cx('vs')}>VS</div>
                                        <div className={cx('phone-2')}></div>
                                    </div>
                                    <p className={cx('loading-text')}>Đang phân tích so sánh...</p>
                                </div>
                            ) : (
                                <p dangerouslySetInnerHTML={{ __html: compare }} />
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default CompareProduct;
