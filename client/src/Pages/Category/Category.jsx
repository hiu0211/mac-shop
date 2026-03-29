import classNames from 'classnames/bind';
import styles from './Category.module.scss';
import Header from '../../Components/Header/Header';
import Footer from '../../Components/Footer/Footer';

import { Select } from 'antd';
import CardBody from '../../Components/CardBody/CardBody';
import { useCallback, useEffect, useRef, useState } from 'react';
import { requestFilterProduct, requestGetBrands } from '../../Config/request';
import { useNavigate } from 'react-router-dom';

const cx = classNames.bind(styles);
const DEFAULT_FILTERS = {
    priceRange: undefined,
    pricedes: undefined,
    brand: 'all',
};

function Category() {
    const [dataProduct, setDataProduct] = useState([]);
    const [productCompare, setProductCompare] = useState([]);
    const [brands, setBrands] = useState([]);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);

    const [checkSelectCompare, setCheckSelectCompare] = useState(false);

    const fetchProducts = useCallback(async (nextFilters) => {
        try {
            const params = {};

            if (nextFilters?.priceRange) {
                params.priceRange = nextFilters.priceRange;
            }

            if (nextFilters?.pricedes) {
                params.pricedes = nextFilters.pricedes;
            }

            if (nextFilters?.brand && nextFilters.brand !== 'all') {
                params.brand = nextFilters.brand;
            }

            const res = await requestFilterProduct(params);
            setDataProduct(res.metadata || []);
        } catch (error) {
            console.error('Error filtering products:', error);
        }
    }, []);

    const fetchBrands = useCallback(async () => {
        try {
            const res = await requestGetBrands({ active: true });
            setBrands(res.metadata || []);
        } catch (error) {
            console.error('Error loading brands:', error);
        }
    }, []);

    const updateFilters = (partialFilters) => {
        const nextFilters = {
            ...filters,
            ...partialFilters,
        };
        setFilters(nextFilters);
        fetchProducts(nextFilters);
    };

    const handlePriceRange = (range) => {
        updateFilters({ priceRange: range });
    };

    const handleSortChange = (value) => {
        updateFilters({ pricedes: value === 'default' ? undefined : value });
    };

    const handleBrandChange = (value) => {
        updateFilters({ brand: value });
    };

    const handleResetFilter = () => {
        setFilters(DEFAULT_FILTERS);
        fetchProducts(DEFAULT_FILTERS);
    };

    const navigate = useNavigate();

    const handleCompare = (item) => {
        setProductCompare([...productCompare, item]);
    };

    useEffect(() => {
        if (productCompare.length === 2) {
            navigate(`/compare-product/${productCompare[0]}/${productCompare[1]}`);
        }
    }, [productCompare, navigate]);

    const ref = useRef();

    useEffect(() => {
        ref.current.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        fetchBrands();
        fetchProducts(DEFAULT_FILTERS);
    }, [fetchBrands, fetchProducts]);

    const brandOptions = [
        { value: 'all', label: 'Tất cả hãng' },
        ...brands.map((brand) => ({ value: brand.name, label: brand.name })),
    ];

    return (
        <div className={cx('wrapper')} ref={ref}>
            <header>
                <Header />
            </header>

            <main className={cx('main')}>
                <div className={cx('inner')}>
                    <div className={cx('fillter')}>
                        <div>
                            <button onClick={handleResetFilter}>Mặc định</button>
                            <button onClick={() => handlePriceRange('under20')}>Dưới 20 triệu</button>
                            <button onClick={() => handlePriceRange('20to40')}>20 - 40 triệu</button>
                            <button onClick={() => handlePriceRange('above40')}>Trên 40 triệu</button>
                        </div>

                        <div>
                            <Select
                                value={filters.pricedes || 'default'}
                                style={{ width: 200 }}
                                onChange={handleSortChange}
                                options={[
                                    { value: 'default', label: 'Sắp xếp mặc định' },
                                    { value: 'desc', label: 'Giá từ cao đến thấp' },
                                    { value: 'asc', label: 'Giá từ thấp đến cao' },
                                ]}
                            />

                            <Select
                                value={filters.brand}
                                style={{ width: 200 }}
                                onChange={handleBrandChange}
                                options={brandOptions}
                            />

                            <button onClick={() => setCheckSelectCompare(!checkSelectCompare)}>
                                {checkSelectCompare ? 'Bỏ so sánh' : 'So sánh'}
                            </button>
                        </div>
                    </div>

                    <div>
                        {dataProduct.map((item) => (
                            <CardBody
                                item={item}
                                checkSelectCompare={checkSelectCompare}
                                handleCompare={handleCompare}
                            />
                        ))}
                    </div>
                </div>
            </main>

            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default Category;
