import classNames from 'classnames/bind';
import styles from './Header.module.scss';

import { Link, useLocation, useNavigate } from 'react-router-dom';

import logoo from '../../assets/images/logoo.png';

import { useStore } from '../../hooks/useStore';

import useDebounce from '../../hooks/useDebounce';

import { Avatar, Badge, Dropdown, Space } from 'antd';
import { UserOutlined, LogoutOutlined, ShoppingCartOutlined, CloseOutlined } from '@ant-design/icons';
import { requestGetBrands, requestGetCart, requestLogout, requestSearchProduct } from '../../Config/request';

import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import Context from '../../store/Context';

const cx = classNames.bind(styles);

function Header() {
    const { dataUser } = useStore();
    const { clearAuth } = useContext(Context);

    const [keyword, setKeyword] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const debouncedValue = useDebounce(keyword, 500);

    const [resultSearch, setResultSearch] = useState([]);
    const [brands, setBrands] = useState([]);
    const [selectedBrand, setSelectedBrand] = useState('all');
    const [isSearchResultOpen, setIsSearchResultOpen] = useState(false);
    const [cartCount, setCartCount] = useState(0);
    const searchRef = useRef(null);

    const navigate = useNavigate();
    const location = useLocation();
    const hasSearchTrigger = Boolean(keyword.trim()) || selectedBrand !== 'all';

    const fetchCartCount = useCallback(async () => {
        if (!dataUser?._id) {
            setCartCount(0);
            return;
        }

        try {
            const res = await requestGetCart();
            const items = res?.metadata?.newData?.data || [];
            const total = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
            setCartCount(total);
        } catch {
            setCartCount(0);
        }
    }, [dataUser?._id]);

    useEffect(() => {
        const fetchBrands = async () => {
            try {
                const res = await requestGetBrands({ active: true });
                setBrands(res?.metadata || []);
            } catch {
                setBrands([]);
            }
        };

        fetchBrands();
    }, []);

    useEffect(() => {
        if (location.pathname !== '/') {
            return;
        }

        const params = new URLSearchParams(location.search);
        const queryKeyword = params.get('q') || '';
        const queryBrand = params.get('brand') || 'all';

        setKeyword(queryKeyword);
        setSelectedBrand(queryBrand);
    }, [location.pathname, location.search]);

    useEffect(() => {
        if (hasSearchTrigger) {
            setIsSearchResultOpen(true);
            return;
        }

        setIsSearchResultOpen(false);
    }, [hasSearchTrigger]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsSearchResultOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            const hasKeyword = Boolean(debouncedValue.trim());
            const hasBrandFilter = selectedBrand !== 'all';

            if (!hasKeyword && !hasBrandFilter) {
                setResultSearch([]);
                return;
            }

            setIsSearching(true);
            try {
                const res = await requestSearchProduct(debouncedValue.trim(), selectedBrand);
                setResultSearch(res?.metadata || []);
            } catch {
                setResultSearch([]);
            } finally {
                setIsSearching(false);
            }
        };
        fetchData();
    }, [debouncedValue, selectedBrand]);

    useEffect(() => {
        fetchCartCount();
    }, [fetchCartCount]);

    useEffect(() => {
        const handleCartUpdated = () => {
            fetchCartCount();
        };

        window.addEventListener('cart-updated', handleCartUpdated);
        return () => window.removeEventListener('cart-updated', handleCartUpdated);
    }, [fetchCartCount]);

    const handleLogout = async () => {
        setLogoutLoading(true);
        try {
            await requestLogout();
            clearAuth();
            navigate('/');
        } catch {
            // Logout error - still navigate away
            clearAuth();
            navigate('/');
        } finally {
            setLogoutLoading(false);
        }
    };

    const menuItems = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: <Link to={`/info-user/${dataUser._id}`}>Tài khoản của tôi</Link>,
            disabled: logoutLoading,
        },
        {
            type: 'divider',
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: logoutLoading ? 'Đang đăng xuất...' : 'Đăng xuất',
            danger: true,
            onClick: handleLogout,
            disabled: logoutLoading,
        },
    ];

    const handleClearSearch = () => {
        setKeyword('');
        setSelectedBrand('all');
        setResultSearch([]);
        setIsSearching(false);
        setIsSearchResultOpen(false);

        if (location.pathname === '/' && location.search) {
            navigate('/', { replace: true });
        }
    };

    const handleOpenSearchResult = () => {
        if (hasSearchTrigger) {
            setIsSearchResultOpen(true);
        }
    };

    const handleSubmitSearch = () => {
        const trimmedKeyword = keyword.trim();
        const hasKeyword = Boolean(trimmedKeyword);
        const hasBrandFilter = selectedBrand !== 'all';

        if (!hasKeyword && !hasBrandFilter) {
            navigate('/');
            return;
        }

        const params = new URLSearchParams();

        if (hasKeyword) {
            params.set('q', trimmedKeyword);
        }

        if (hasBrandFilter) {
            params.set('brand', selectedBrand);
        }

        setResultSearch([]);
        setIsSearching(false);
        setIsSearchResultOpen(false);
        navigate(`/?${params.toString()}`);
    };

    return (
        <div className={cx('wrapper')}>
            <div className={cx('inner')}>
                <Link to="/">
                    <div className={cx('logo')}>
                        <img src={logoo} alt="logo" />
                    </div>
                </Link>

                <div className={cx('search')} ref={searchRef}>
                    <div className={cx('search-input-group')} onClick={handleOpenSearchResult}>
                        <select
                            className={cx('brand-filter')}
                            value={selectedBrand}
                            onChange={(e) => setSelectedBrand(e.target.value)}
                            onFocus={handleOpenSearchResult}
                        >
                            <option value="all">Tất cả</option>
                            {brands.map((brand) => (
                                <option key={brand._id || brand.name} value={brand.name}>
                                    {brand.name}
                                </option>
                            ))}
                        </select>

                        <input
                            className={cx({ 'has-clear': hasSearchTrigger })}
                            type="text"
                            placeholder="Tìm kiếm sản phẩm hoặc hãng..."
                            onChange={(e) => setKeyword(e.target.value)}
                            onFocus={handleOpenSearchResult}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSubmitSearch();
                                }
                            }}
                            value={keyword}
                        />

                        {hasSearchTrigger && (
                            <button
                                type="button"
                                className={cx('clear-search')}
                                onClick={handleClearSearch}
                                aria-label="Xóa nhanh tìm kiếm và bộ lọc"
                            >
                                <CloseOutlined />
                            </button>
                        )}
                    </div>

                    {hasSearchTrigger && isSearchResultOpen && (
                        <div className={cx('result-search')}>
                            {isSearching ? (
                                <div className={cx('searching')}>
                                    <span>Đang tìm kiếm...</span>
                                </div>
                            ) : resultSearch.length > 0 ? (
                                resultSearch.map((item) => (
                                    <Link to={`/product/${item._id}`} key={item._id} className={cx('search-item')}>
                                        <img src={item.images[0]} alt={item.name} />
                                        <div className={cx('info')}>
                                            <h4>{item.name}</h4>
                                            <span className={cx('brand')}>{item.brand || 'Khác'}</span>
                                            <p className={cx('price')}>{item.price.toLocaleString('vi-VN')}đ</p>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className={cx('no-result')}>
                                    <span>Không tìm thấy sản phẩm nào</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className={cx('user-actions')}>
                    <Link to="/cart" className={cx('cart-link')}>
                        <Badge count={cartCount} size="small" overflowCount={99}>
                            <ShoppingCartOutlined className={cx('cart-icon')} />
                        </Badge>
                        {/* <span className={cx('cart-text')}>Giỏ hàng</span> */}
                    </Link>

                    {dataUser._id ? (
                        <Dropdown menu={{ items: menuItems }} trigger={['click']}>
                            <Space style={{ cursor: 'pointer' }}>
                                <Avatar size="large" icon={<UserOutlined />} />
                            </Space>
                        </Dropdown>
                    ) : (
                        <div className={cx('button-group')}>
                            <Link to="/register">
                                <button>Đăng ký</button>
                            </Link>
                            <Link to="/login">
                                <button>Đăng nhập</button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Header;
