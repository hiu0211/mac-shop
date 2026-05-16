import classNames from 'classnames/bind';
import styles from './ProductsHome.module.scss';
import CardBody from '../../CardBody/CardBody';
import { Link, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { requestGetProducts, requestSearchProduct } from '../../../Config/request';

const cx = classNames.bind(styles);

const normalizeText = (value = '') => value.toLowerCase().trim().replace(/\s+/g, ' ');

const scoreByKeyword = (name = '', keywordText = '') => {
    const normalizedName = normalizeText(name);
    const normalizedKeyword = normalizeText(keywordText);

    if (!normalizedKeyword) return 0;
    if (normalizedName === normalizedKeyword) return 3;
    if (normalizedName.startsWith(normalizedKeyword)) return 2;
    if (normalizedName.includes(normalizedKeyword)) return 1;
    return 0;
};

function ProductsHome() {
    const [products, setProducts] = useState([]);
    const location = useLocation();

    const { keyword, selectedBrand, hasSearchCriteria } = useMemo(() => {
        const params = new URLSearchParams(location.search);
        const queryKeyword = (params.get('q') || '').trim();
        const queryBrand = (params.get('brand') || 'all').trim() || 'all';

        return {
            keyword: queryKeyword,
            selectedBrand: queryBrand,
            hasSearchCriteria: Boolean(queryKeyword) || queryBrand !== 'all',
        };
    }, [location.search]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (!hasSearchCriteria) {
                    const res = await requestGetProducts(8);
                    setProducts(res?.metadata || []);
                    return;
                }

                const res = await requestSearchProduct(keyword, selectedBrand);
                const sourceProducts = res?.metadata || [];
                const normalizedKeyword = normalizeText(keyword);

                if (!normalizedKeyword) {
                    setProducts(sourceProducts);
                    return;
                }

                const relatedProducts = sourceProducts.filter((item) =>
                    normalizeText(item?.name || '').includes(normalizedKeyword),
                );

                const productsToRender = (relatedProducts.length > 0 ? relatedProducts : sourceProducts).sort(
                    (a, b) => scoreByKeyword(b?.name || '', keyword) - scoreByKeyword(a?.name || '', keyword),
                );

                setProducts(productsToRender);
            } catch {
                setProducts([]);
            }
        };

        fetchData();
    }, [hasSearchCriteria, keyword, selectedBrand]);

    const headingText = hasSearchCriteria ? null : 'Sản phẩm nổi bật';

    const subText = hasSearchCriteria
        ? `Tìm thấy ${products.length} sản phẩm phù hợp${selectedBrand !== 'all' ? ` - Hãng: ${selectedBrand}` : ''}`
        : '';

    return (
        <div className={cx('wrapper')}>
            <div className={cx('inner')}>
                <div className={cx('title')}>
                    <h2>{headingText}</h2>
                    {subText && <p>{subText}</p>}
                </div>
                <div className={cx('card-body')}>
                    {products.map((item) => (
                        <CardBody key={item._id} item={item} />
                    ))}
                </div>

                {hasSearchCriteria && products.length === 0 && (
                    <p className={cx('empty-search')}>Không có sản phẩm phù hợp với từ khóa bạn đã tìm.</p>
                )}

                <div className={cx('button-group')}>
                    <Link to="/category">
                        <button>Xem toàn bộ sản phẩm</button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default ProductsHome;