import classNames from 'classnames/bind';
import styles from './Header.module.scss';

import { Link, useNavigate } from 'react-router-dom';

import logoo from '../../assets/images/logoo.png';

import { useStore } from '../../hooks/useStore';

import useDebounce from '../../hooks/useDebounce';

import { Avatar, Badge, Dropdown, Space } from 'antd';
import { UserOutlined, LogoutOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { requestGetCart, requestLogout, requestSearchProduct } from '../../Config/request';

import { useCallback, useEffect, useState } from 'react';

const cx = classNames.bind(styles);

function Header() {
    const { dataUser } = useStore();

    const [keyword, setKeyword] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const debouncedValue = useDebounce(keyword, 500);

    const [resultSearch, setResultSearch] = useState([]);
    const [cartCount, setCartCount] = useState(0);

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
        const fetchData = async () => {
            if (!debouncedValue.trim()) {
                setResultSearch([]);
                return;
            }

            setIsSearching(true);
            try {
                const res = await requestSearchProduct(debouncedValue);
                setResultSearch(res.metadata);
            } catch {
                setResultSearch([]);
            } finally {
                setIsSearching(false);
            }
        };
        fetchData();
    }, [debouncedValue]);

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

    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await requestLogout();
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            navigate('/');
        } catch {
            return;
        }
    };

    const menuItems = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: <Link to={`/info-user/${dataUser._id}`}>Tài khoản của tôi</Link>,
        },
        {
            type: 'divider',
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Đăng xuất',
            danger: true,
            onClick: handleLogout,
        },
    ];

    return (
        <div className={cx('wrapper')}>
            <div className={cx('inner')}>
                <Link to="/">
                    <div className={cx('logo')}>
                        <img src={logoo} alt="logo" />
                    </div>
                </Link>

                <div className={cx('search')}>
                    <input
                        type="text"
                        placeholder="Tìm kiếm sản phẩm..."
                        onChange={(e) => setKeyword(e.target.value)}
                        value={keyword}
                    />
                    {keyword.trim() && (
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
                                            <p>{item.price.toLocaleString('vi-VN')}đ</p>
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
