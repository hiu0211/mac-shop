import classNames from 'classnames/bind';
import styles from './Category.module.scss';
import Header from '../../Components/Header/Header';
import Footer from '../../Components/Footer/Footer';

import { Select, Slider } from 'antd';
import CardBody from '../../Components/CardBody/CardBody';
import { useCallback, useEffect, useRef, useState } from 'react';
import { requestFilterProduct, requestGetBrands } from '../../Config/request';
import { useNavigate, useLocation } from 'react-router-dom';

const cx = classNames.bind(styles);
const DEFAULT_FILTERS = {
    priceRange: [0, 100000000],
    pricedes: undefined,
    brand: 'all',
    category: undefined,
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

            if (nextFilters?.priceRange && Array.isArray(nextFilters.priceRange)) {
                params.minPrice = nextFilters.priceRange[0];
                params.maxPrice = nextFilters.priceRange[1];
            }

            if (nextFilters?.pricedes) {
                params.pricedes = nextFilters.pricedes;
            }

            if (nextFilters?.brand && nextFilters.brand !== 'all') {
                params.brand = nextFilters.brand;
            }

            if (nextFilters?.category) {
                params.category = nextFilters.category;
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
    const location = useLocation();

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
        const params = new URLSearchParams(location.search);
        const urlBrand = params.get('brand');
        const urlCategory = params.get('category');
        const urlPriceRange = params.get('priceRange');
        
        let parsedPriceRange = DEFAULT_FILTERS.priceRange;
        if (urlPriceRange) {
            try {
                parsedPriceRange = JSON.parse(urlPriceRange);
            } catch (error) {
                console.error('Error parsing priceRange from URL:', error);
            }
        }

        const initialFilters = {
            ...DEFAULT_FILTERS,
            brand: urlBrand || 'all',
            category: urlCategory || undefined,
            priceRange: parsedPriceRange,
        };
        setFilters(initialFilters);
        fetchProducts(initialFilters);
    }, [fetchBrands, fetchProducts, location.search]);

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
                            <h4 style={{ display: 'flex', alignItems: 'center' }}>Khoảng giá</h4>
                            <Slider
                                range
                                style={{ width: 230 }}
                                min={0}
                                max={100000000}
                                step={1000000}
                                value={filters.priceRange}
                                onChange={(value) => updateFilters({ priceRange: value })}
                                tooltip={{
                                    formatter: (value) => `${value.toLocaleString('vi-VN')}đ`,
                                }}
                            />
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
