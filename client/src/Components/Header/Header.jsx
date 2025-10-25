import classNames from 'classnames/bind';
import styles from './Header.module.scss';

import { Link, useNavigate } from 'react-router-dom';

import logoo from '../../assets/images/logoo.png';

import { useStore } from '../../hooks/useStore';

import useDebounce from '../../hooks/useDebounce';

import { Avatar, Dropdown, Menu, Space } from 'antd';
import { UserOutlined, LogoutOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { requestLogout, requestSearchProduct } from '../../Config/request';

import { useEffect, useState } from 'react';

const cx = classNames.bind(styles);

function Header() {
    const { dataUser } = useStore();

    const [keyword, setKeyword] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const debouncedValue = useDebounce(keyword, 500);

    const [resultSearch, setResultSearch] = useState([]);

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
                {dataUser._id ? (
                    <>
                        <Dropdown
                            overlay={
                                <Menu>
                                    <Link to={`/info-user/${dataUser._id}`}>
                                        <Menu.Item key="profile" icon={<UserOutlined />}>
                                            Hồ sơ
                                        </Menu.Item>
                                    </Link>
                                    <Link to={`/cart`}>
                                        <Menu.Item key="cart" icon={<ShoppingCartOutlined />}>
                                            Giỏ hàng
                                        </Menu.Item>
                                    </Link>

                                    <Menu.Divider />

                                    <Menu.Item onClick={handleLogout} key="logout" icon={<LogoutOutlined />} danger>
                                        Đăng xuất
                                    </Menu.Item>
                                </Menu>
                            }
                            trigger={['click']}
                        >
                            <Space style={{ cursor: 'pointer' }}>
                                <Avatar size="large" icon={<UserOutlined />} />
                            </Space>
                        </Dropdown>
                    </>
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
    );
}

export default Header;
