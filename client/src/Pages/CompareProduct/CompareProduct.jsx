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
                                    <span>Giao hàng ngày mở bán tại Việt Nam 20/05/2025</span>
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
                                <div>
                                    <h5>Bộ xử lý CPU</h5>
                                    <p>{product1?.cpu}</p>
                                </div>

                                <div>
                                    <h5>Ram</h5>
                                    <p>{product1?.ram}</p>
                                </div>

                                <div>
                                    <h5>Màn hình</h5>
                                    <p>{product1?.screen}</p>
                                </div>
                                <div>
                                    <h5>GPU</h5>
                                    <p>{product1?.gpu}</p>
                                </div>
                                <div>
                                    <h5>Ổ cứng</h5>
                                    <p>{product1?.storage}</p>
                                </div>
                                <div>
                                    <h5>Kích thước</h5>
                                    <p>{product1?.weight}</p>
                                </div>
                                <div>
                                    <h5>Camera</h5>
                                    <p>{product1?.camera}</p>
                                </div>
                                <div>
                                    <h5>Pin</h5>
                                    <p>{product1?.battery}</p>
                                </div>
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
                                    <span>Giao hàng ngày mở bán tại Việt Nam 20/05/2025</span>
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
                                <div>
                                    <h5>Bộ xử lý CPU</h5>
                                    <p>{product2?.cpu}</p>
                                </div>

                                <div>
                                    <h5>Ram</h5>
                                    <p>{product2?.ram}</p>
                                </div>

                                <div>
                                    <h5>Màn hình</h5>
                                    <p>{product2?.screen}</p>
                                </div>
                                <div>
                                    <h5>GPU</h5>
                                    <p>{product2?.gpu}</p>
                                </div>
                                <div>
                                    <h5>Ổ cứng</h5>
                                    <p>{product2?.storage}</p>
                                </div>
                                <div>
                                    <h5>Kích thước</h5>
                                    <p>{product2?.weight}</p>
                                </div>
                                <div>
                                    <h5>Camera</h5>
                                    <p>{product2?.camera}</p>
                                </div>
                                <div>
                                    <h5>Pin</h5>
                                    <p>{product2?.battery}</p>
                                </div>
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
