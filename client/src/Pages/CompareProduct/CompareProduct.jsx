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
                            <div className={cx('product-thumbnail-wrapper')}>
                                <img
                                    src={product1?.thumbnail || product1?.image || product1?.images?.[0]}
                                    alt={product1?.name}
                                    className={cx('product-thumbnail')}
                                />
                            </div>
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
                                    <p> Dùng thử 10 ngày miễn phí đổi máy.</p>
                                </li>
                                <li>
                                    <FontAwesomeIcon icon={faCheckCircle} />
                                    <p>Lỗi 1 Đổi 1 trong 30 ngày đầu.</p>
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

                        </div>
                    </div>

                    <div>
                        <div className={cx('product-info')}>
                            <h1>{product2?.name}</h1>
                            <div className={cx('product-thumbnail-wrapper')}>
                                <img
                                    src={product2?.thumbnail || product2?.image || product2?.images?.[0]}
                                    alt={product2?.name}
                                    className={cx('product-thumbnail')}
                                />
                            </div>
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
                                    <p> Dùng thử 10 ngày miễn phí đổi máy.</p>
                                </li>
                                <li>
                                    <FontAwesomeIcon icon={faCheckCircle} />
                                    <p>Lỗi 1 Đổi 1 trong 30 ngày đầu.</p>
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
                            ) : typeof compare === 'object' && compare !== null && compare.quickSummary ? (
                                <div className={cx('ai-comparison')}>
                                    <div className={cx('quick-summary')}>
                                        <div className={cx('product-col')}>
                                            <h3>{compare.quickSummary.product1?.name}</h3>
                                            <div className={cx('pros-cons')}>
                                                <h4>Ưu điểm</h4>
                                                <ul>
                                                    {compare.quickSummary.product1?.pros?.map((pro, idx) => (
                                                        <li key={idx}><span className={cx('icon', 'pro')}>✅</span> {pro}</li>
                                                    ))}
                                                </ul>
                                                <h4>Nhược điểm</h4>
                                                <ul>
                                                    {compare.quickSummary.product1?.cons?.map((con, idx) => (
                                                        <li key={idx}><span className={cx('icon', 'con')}>❌</span> {con}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                        <div className={cx('product-col')}>
                                            <h3>{compare.quickSummary.product2?.name}</h3>
                                            <div className={cx('pros-cons')}>
                                                <h4>Ưu điểm</h4>
                                                <ul>
                                                    {compare.quickSummary.product2?.pros?.map((pro, idx) => (
                                                        <li key={idx}><span className={cx('icon', 'pro')}>✅</span> {pro}</li>
                                                    ))}
                                                </ul>
                                                <h4>Nhược điểm</h4>
                                                <ul>
                                                    {compare.quickSummary.product2?.cons?.map((con, idx) => (
                                                        <li key={idx}><span className={cx('icon', 'con')}>❌</span> {con}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={cx('score-section')}>
                                        <h3>Điểm Đánh Giá</h3>
                                        <div className={cx('score-legend')}>
                                            <div className={cx('legend-item')}>
                                                <div className={cx('legend-dot', 'prod1')}></div>
                                                <span>{compare.quickSummary.product1?.name}</span>
                                            </div>
                                            <div className={cx('legend-item')}>
                                                <div className={cx('legend-dot', 'prod2')}></div>
                                                <span>{compare.quickSummary.product2?.name}</span>
                                            </div>
                                        </div>
                                        <div className={cx('score-chart')}>
                                            {compare.scores?.categories?.map((cat, idx) => (
                                                <div key={idx} className={cx('score-row')}>
                                                    <span className={cx('score-label')}>{cat}</span>
                                                    <div className={cx('score-bars')}>
                                                        <div className={cx('bar-wrapper')}>
                                                            <div className={cx('bar', 'prod1')} style={{ width: `${(compare.scores.product1Scores[idx] / 10) * 100}%` }}>
                                                                <span className={cx('score-value')}>{compare.scores.product1Scores[idx]}</span>
                                                            </div>
                                                        </div>
                                                        <div className={cx('bar-wrapper')}>
                                                            <div className={cx('bar', 'prod2')} style={{ width: `${(compare.scores.product2Scores[idx] / 10) * 100}%` }}>
                                                                <span className={cx('score-value')}>{compare.scores.product2Scores[idx]}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className={cx('spec-section')}>
                                        <h3>So sánh thông số chi tiết</h3>
                                        <table className={cx('spec-table')}>
                                            <thead>
                                                <tr>
                                                    <th>Tiêu chí</th>
                                                    <th>{compare.quickSummary.product1?.name}</th>
                                                    <th>{compare.quickSummary.product2?.name}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {compare.specComparison?.map((spec, idx) => (
                                                    <tr key={idx}>
                                                        <td className={cx('spec-label')}>{spec.label}</td>
                                                        <td className={cx({ winner: spec.winner === 1 })}>{spec.value1}</td>
                                                        <td className={cx({ winner: spec.winner === 2 })}>{spec.value2}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className={cx('verdict-box')}>
                                        <div className={cx('verdict', 'prod1')}>
                                            <h4>Nên chọn {compare.quickSummary.product1?.name} nếu:</h4>
                                            <p>{compare.verdict?.buyProduct1If}</p>
                                        </div>
                                        <div className={cx('verdict', 'prod2')}>
                                            <h4>Nên chọn {compare.quickSummary.product2?.name} nếu:</h4>
                                            <p>{compare.verdict?.buyProduct2If}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div dangerouslySetInnerHTML={{ __html: typeof compare === 'string' ? compare : JSON.stringify(compare) }} />
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default CompareProduct;
