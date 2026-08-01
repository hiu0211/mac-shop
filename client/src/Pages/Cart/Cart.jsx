import classNames from 'classnames/bind';
import styles from './Cart.module.scss';
import Header from '../../Components/Header/Header';
import { Button, Table, Form, Input, AutoComplete, InputNumber, Spin, Divider, message, Select, Tag, Space } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import {
    requestApplyCoupon,
    requestDeleteCart,
    requestGetCart,
    requestPayment,
    requestRemoveCoupon,
    requestUpdateInfoUserCart,
    requestCheckEmailExists,
    requestUpdateQuantityCart,
    requestGetAvailableCoupons,
} from '../../Config/request';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useDebounce from '../../hooks/useDebounce';
import useDebounceCallback from '../../hooks/useDebounceCallback';
import { useStore } from '../../hooks/useStore';
import { MinusOutlined, PlusOutlined, ShoppingCartOutlined } from '@ant-design/icons';

const cx = classNames.bind(styles);

function Cart() {
    const { dataUser } = useStore();
    const [cart, setCart] = useState([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [totalPrice, setTotalPrice] = useState(0);
    const [totalPriceAfterDiscount, setTotalPriceAfterDiscount] = useState(0);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [vipTier, setVipTier] = useState('none');
    const [vipDiscountRate, setVipDiscountRate] = useState(0);
    const [vipDiscountAmount, setVipDiscountAmount] = useState(0);
    const [couponCode, setCouponCode] = useState('');
    const [selectedCouponCode, setSelectedCouponCode] = useState(undefined);
    const [applyingCoupon, setApplyingCoupon] = useState(false);
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [updatingQuantity, setUpdatingQuantity] = useState({});
    const [availableCoupons, setAvailableCoupons] = useState([]);
    const [initialLoading, setInitialLoading] = useState(true);

    const [addressOptions, setAddressOptions] = useState([]);
    const [valueAddress, setValueAddress] = useState('');

    const debounce = useDebounce(valueAddress, 500);
    const navigate = useNavigate();

    const fetchCart = useCallback(async () => {
        try {
            const res = await requestGetCart();
            const newData = res?.metadata?.newData || {};
            const cartData = Array.isArray(newData.data) ? newData.data : [];
            setCart(cartData);
            setDiscountAmount(Number(newData.discountAmount || newData.couponDiscountAmount || 0));
            setVipTier(newData.vipTier || 'none');
            setVipDiscountRate(Number(newData.vipDiscountRate || 0));
            setVipDiscountAmount(Number(newData.vipDiscountAmount || 0));
            setCouponCode(newData.couponCode || '');
            setSelectedCouponCode(newData.couponCode || undefined);
            const autoEmail = newData.email || dataUser?.email || '';
            if (autoEmail) {
                form.setFieldsValue({
                    email: autoEmail,
                });
            }
            setSelectedRowKeys((prev) => prev.filter((key) => cartData.some((item) => {
                const itemProductId = item.productId || item._id || item.id;
                const itemCartKey = item.cartItemKey || `${itemProductId}-${item.selectedColorKey || 'default'}`;
                return itemCartKey === key;
            })));
        } catch (error) {
            console.error(error);
            setCart([]);
            setSelectedRowKeys([]);
            setTotalPrice(0);
            setTotalPriceAfterDiscount(0);
            setDiscountAmount(0);
            setVipTier('none');
            setVipDiscountRate(0);
            setVipDiscountAmount(0);
            setCouponCode('');
            setSelectedCouponCode(undefined);
            message.error(error?.response?.data?.message || 'Không thể tải giỏ hàng');
        } finally {
            setInitialLoading(false);
        }
    }, [navigate]);

    const fetchAvailableCoupons = useCallback(async () => {
        try {
            const res = await requestGetAvailableCoupons();
            setAvailableCoupons(res?.metadata || []);
        } catch (error) {
            console.error('Error fetching available coupons:', error);
            setAvailableCoupons([]);
        }
    }, []);

    useEffect(() => {
        return () => {
            if (couponCode) {
                requestRemoveCoupon().catch((error) => {
                    console.error('Lỗi khi xóa mã giảm giá tự động:', error);
                });
            }
        };
    }, [couponCode]);

    useEffect(() => {
        fetchCart();
        fetchAvailableCoupons();
    }, [fetchCart, fetchAvailableCoupons]);

    useEffect(() => {
        const selectedItems = cart.filter((item) => {
            const itemProductId = item.productId || item._id || item.id;
            return selectedRowKeys.includes(item.cartItemKey || `${itemProductId}-${item.selectedColorKey || 'default'}`);
        });
        const selectedTotal = selectedItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
        const calculatedVipDiscount = Math.floor((selectedTotal * vipDiscountRate) / 100);
        const subtotalAfterVip = Math.max(0, selectedTotal - calculatedVipDiscount);
        const couponDisc = couponCode ? discountAmount : 0;
        const finalPrice = Math.max(0, subtotalAfterVip - couponDisc);

        setTotalPrice(selectedTotal);
        setVipDiscountAmount(calculatedVipDiscount);
        setTotalPriceAfterDiscount(finalPrice);
    }, [cart, selectedRowKeys, couponCode, discountAmount, vipDiscountRate]);

    useEffect(() => {
        const fetchAddressData = async () => {
            try {
                const response = await axios.get('https://rsapi.goong.io/Place/AutoComplete', {
                    params: {
                        input: debounce,
                        api_key: '3HcKy9jen6utmzxno4HwpkN1fJYll5EM90k53N4K',
                    },
                });

                const options = response.data.predictions.map((item) => ({
                    value: item.description,
                    label: item.description,
                }));

                setAddressOptions(options);
            } catch (error) {
                console.error('Lỗi khi lấy địa chỉ:', error);
                message.error('Không thể tải danh sách địa chỉ');
            }
        };

        if (debounce !== '') {
            fetchAddressData();
        } else {
            setAddressOptions([]);
        }
    }, [debounce]);

    const updateQuantityAPI = async (record, newQuantity) => {
        const resolvedProductId = record?.productId || record?.id || record?._id;
        if (!resolvedProductId) {
            message.error('Không xác định được sản phẩm để cập nhật');
            return;
        }

        try {
            const updatingKey = record.cartItemKey || resolvedProductId;
            setUpdatingQuantity(prev => ({ ...prev, [updatingKey]: true }));
            await requestUpdateQuantityCart(resolvedProductId, newQuantity, record.selectedColorKey || undefined);
            await fetchCart();
            window.dispatchEvent(new Event('cart-updated'));
            message.success('Cập nhật số lượng thành công');
        } catch (error) {
            console.error(error);
            message.error(error.response?.data?.message || 'Cập nhật số lượng thất bại');
            await fetchCart();
        } finally {
            const updatingKey = record.cartItemKey || resolvedProductId;
            setUpdatingQuantity(prev => ({ ...prev, [updatingKey]: false }));
        }
    };

    const debouncedUpdateAPI = useDebounceCallback(updateQuantityAPI, 800);

    const handleUpdateQuantity = (record, newQuantity) => {
        if (!newQuantity || newQuantity < 1) {
            message.warning('Số lượng phải lớn hơn 0');
            return;
        }

        const currentProduct = cart.find(item => item.cartItemKey === record.cartItemKey);
        if (currentProduct && currentProduct.quantity === newQuantity) {
            return;
        }

        setCart(prevCart =>
            prevCart.map(item =>
                item.cartItemKey === record.cartItemKey
                    ? { ...item, quantity: newQuantity }
                    : item
            )
        );

        const debounceKey = record.cartItemKey || record.productId || record.id || record._id;
        debouncedUpdateAPI(debounceKey, record, newQuantity);
    };

    const handleDelete = async (record) => {
        const resolvedProductId = record.productId || record.id;
        if (!resolvedProductId) {
            message.error('Không xác định được sản phẩm để xóa');
            return;
        }

        try {
            await requestDeleteCart(resolvedProductId, record.selectedColorKey || undefined);
            await fetchCart();
            window.dispatchEvent(new Event('cart-updated'));
            message.success('Xóa sản phẩm thành công');
        } catch (error) {
            console.error(error);
            message.error('Xóa sản phẩm thất bại');
        }
    };

    const handleSubmit = async (values) => {
        try {
            setLoading(true);
            const data = {
                fullName: values.fullName,
                phone: values.phone,
                address: values.address,
                email: values.email,
            };

            await requestUpdateInfoUserCart(data);
        } catch (error) {
            console.error(error);
            const serverMessage = error?.response?.data?.message || 'Cập nhật thông tin thất bại';
            message.error(serverMessage);
            if (serverMessage.toLowerCase().includes('email')) {
                form.setFields([
                    {
                        name: 'email',
                        errors: [serverMessage],
                    },
                ]);
            }
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const handlePayments = async (typePayment) => {
        try {
            if (!selectedRowKeys || selectedRowKeys.length === 0) {
                message.error('Bạn vẫn chưa chọn sản phẩm nào để mua.');
                return;
            }
            const values = await form.validateFields();
            setLoading(true);

            await handleSubmit(values);

            switch (typePayment) {
                case 'COD': {
                    const codRes = await requestPayment(typePayment);
                    navigate(`/payment/${codRes.metadata}`);
                    break;
                }
                case 'VNPAY': {
                    const vnpayRes = await requestPayment(typePayment);
                    window.open(vnpayRes.metadata, '_blank');
                    break;
                }
                default:
                    message.error('Phương thức thanh toán không hợp lệ');
            }
        } catch (error) {
            if (error?.errorFields) {
                message.error('Vui lòng điền đầy đủ thông tin thanh toán');
            } else if (error?.response?.data?.message) {
                // Đã thông báo lỗi từ server trong handleSubmit
            } else {
                message.error(typeof error === 'string' ? error : 'Có lỗi xảy ra khi thanh toán');
            }
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddressSearch = (value) => {
        setValueAddress(value);
    };

    const handleAddressSelect = (value) => {
        form.setFieldsValue({ address: value });
    };

    const handleApplyCoupon = async (code) => {
        try {
            const normalizedCode = code?.trim();
            if (!normalizedCode) {
                return;
            }
            setApplyingCoupon(true);
            const res = await requestApplyCoupon(normalizedCode);
            setDiscountAmount(res.metadata.discountAmount || 0);
            setTotalPriceAfterDiscount(res.metadata.totalPriceAfterDiscount || totalPrice);
            const appliedCode = res.metadata.code || normalizedCode.toUpperCase();
            setCouponCode(appliedCode);
            setSelectedCouponCode(appliedCode);
            message.success('Áp dụng mã giảm giá thành công');
        } catch (error) {
            console.error(error);
            message.error(error.response?.data?.message || 'Mã giảm giá không hợp lệ');
        } finally {
            setApplyingCoupon(false);
        }
    };

    const handleRemoveCoupon = async () => {
        try {
            await requestRemoveCoupon();
            setDiscountAmount(0);
            setTotalPriceAfterDiscount(totalPrice);
            setCouponCode('');
            setSelectedCouponCode(undefined);
            message.success('Đã hủy mã giảm giá');
        } catch (error) {
            console.error(error);
            message.error('Không thể hủy mã giảm giá');
        }
    };

    const dataSource = cart.map((item) => {
        const productId = item.productId || item._id || item.id;

        return {
            key: item.cartItemKey || `${productId}-${item.selectedColorKey || 'default'}`,
            cartItemKey: item.cartItemKey || `${productId}-${item.selectedColorKey || 'default'}`,
            id: productId,
            productId,
            name: item.name,
            image: item.selectedColorImage || item.images?.[0],
            price: Number(item.price || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }),
            quantity: item.quantity,
            stock: item.stock,
            selectedColorKey: item.selectedColorKey,
            selectedColorName: item.selectedColorName,
        };
    });

    const columns = [
        {
            title: 'Hình ảnh',
            dataIndex: 'image',
            key: 'image',
            align: 'center',
            render: (image) => <img src={image} alt="product" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />,
        },
        {
            title: 'Tên sản phẩm',
            dataIndex: 'name',
            key: 'name',
            align: 'left',
            render: (_, record) => (
                <div>
                    <div>{record.name}</div>
                    {record.selectedColorName && (
                        <div style={{ color: '#666', fontSize: 12 }}>
                            Màu: {record.selectedColorName}
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: 'Giá',
            dataIndex: 'price',
            key: 'price',
            align: 'center',
            width: '120px',
        },
        {
            title: 'Số lượng',
            dataIndex: 'quantity',
            key: 'quantity',
            align: 'center',
            width: '140px',
            render: (quantity, record) => (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Button
                        size="small"
                        icon={<MinusOutlined />}
                        onClick={() => handleUpdateQuantity(record, quantity - 1)}
                        disabled={quantity <= 1 || updatingQuantity[record.cartItemKey]}
                    />
                    <InputNumber
                        min={1}
                        max={record.stock + quantity}
                        value={quantity}
                        onChange={(value) => handleUpdateQuantity(record, value)}
                        disabled={updatingQuantity[record.cartItemKey]}
                        style={{ width: '50px' }}
                        controls={false}
                    />
                    <Button
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => handleUpdateQuantity(record, quantity + 1)}
                        disabled={updatingQuantity[record.cartItemKey]}
                    />
                </div>
            ),
        },
        {
            title: 'Thao tác',
            dataIndex: 'action',
            key: 'action',
            align: 'center',
            width: '100px',
            render: (_, record) => (
                <Button onClick={() => handleDelete(record)} type="text" danger>
                    Xóa
                </Button>
            ),
        },
    ];

    const rowSelection = {
        selectedRowKeys,
        onChange: (newSelectedRowKeys) => setSelectedRowKeys(newSelectedRowKeys),
    };

    return (
        <div className={cx('wrapper')}>
            <header>
                <Header />
            </header>

            <main className={cx('main')}>
                <div className={cx('container')}>
                    <h2 className={cx('page-title')}>Giỏ hàng</h2>

                    {initialLoading ? (
                        <div style={{ textAlign: 'center', padding: '80px 0' }}>
                            <Spin size="large" tip="Đang tải giỏ hàng..." />
                        </div>
                    ) : cart.length === 0 ? (
                        <div className={cx('empty-cart')}>
                            <ShoppingCartOutlined className={cx('empty-icon')} />
                            <p>Không có sản phẩm nào trong giỏ hàng</p>
                            <Button type="primary" size="large" onClick={() => navigate('/')}>
                                Tiếp tục mua sắm
                            </Button>
                        </div>
                    ) : (
                        <div className={cx('cart-layout')}>
                            {/* HÀNG TRÊN: Danh sách sản phẩm 100% */}
                            <div className={cx('cart-top-section')}>
                                <div className={cx('cart-items-card')}>
                                    <Table
                                        bordered={false}
                                        dataSource={dataSource}
                                        columns={columns}
                                        rowSelection={rowSelection}
                                        pagination={false}
                                        scroll={{ x: 700 }}
                                    />
                                </div>
                            </div>

                            {/* HÀNG DƯỚI: Chia layout 70 - 30 */}
                            <div className={cx('cart-bottom-section')}>
                                {/* 70% Trái: Thông tin nhận hàng */}
                                <div className={cx('checkout-info-card')}>
                                    <h4 className={cx('section-title')}>Thông tin nhận hàng</h4>
                                    <Form form={form} layout="vertical" onFinish={handleSubmit}>
                                        <Form.Item
                                            label="Họ và tên"
                                            name="fullName"
                                            rules={[{ required: true, message: 'Vui lòng nhập họ và tên!' }]}
                                        >
                                            <Input placeholder="Nhập họ và tên người nhận" size="large" />
                                        </Form.Item>

                                        <Form.Item
                                            label="Số điện thoại"
                                            name="phone"
                                            rules={[
                                                { required: true, message: 'Vui lòng nhập số điện thoại!' },
                                                { pattern: /^[0-9]{10}$/, message: 'Số điện thoại không hợp lệ!' },
                                            ]}
                                        >
                                            <Input placeholder="Nhập số điện thoại liên hệ" size="large" />
                                        </Form.Item>

                                        <Form.Item
                                            label="Email"
                                            name="email"
                                            hasFeedback
                                            rules={[
                                                { required: true, message: 'Vui lòng nhập email!' },
                                                { type: 'email', message: 'Email không hợp lệ!' },
                                                {
                                                    validator: async (_, value) => {
                                                        if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                                                            return Promise.resolve();
                                                        }
                                                        const normalizedInput = value.trim().toLowerCase();
                                                        if (dataUser?.email && normalizedInput === dataUser.email.toLowerCase()) {
                                                            return Promise.resolve();
                                                        }
                                                        try {
                                                            const exists = await requestCheckEmailExists(normalizedInput);
                                                            if (exists) {
                                                                return Promise.reject(new Error('Email này đã được đăng ký. Vui lòng đăng nhập để tiếp tục mua hàng.'));
                                                            }
                                                        } catch (err) {
                                                            console.error(err);
                                                        }
                                                        return Promise.resolve();
                                                    },
                                                    validateTrigger: 'onBlur',
                                                },
                                            ]}
                                        >
                                            <Input placeholder="Nhập email nhận thông báo đơn hàng" size="large" />
                                        </Form.Item>

                                        <Form.Item
                                            label="Địa chỉ giao hàng"
                                            name="address"
                                            rules={[{ required: true, message: 'Vui lòng nhập địa chỉ!' }]}
                                        >
                                            <AutoComplete
                                                options={addressOptions}
                                                onSearch={handleAddressSearch}
                                                onSelect={handleAddressSelect}
                                                placeholder="Nhập địa chỉ nhận hàng"
                                                filterOption={false}
                                                size="large"
                                                notFoundContent={valueAddress ? "Đang tìm kiếm..." : null}
                                            />
                                        </Form.Item>

                                        <div className={cx('payment-actions')}>
                                            <Button
                                                onClick={() => handlePayments('COD')}
                                                className={cx('submit-btn')}
                                                loading={loading}
                                                size="large"
                                                block
                                            >
                                                Thanh toán khi nhận hàng (COD)
                                            </Button>

                                            <Button
                                                onClick={() => handlePayments('VNPAY')}
                                                className={cx('payment-btn-vnpay')}
                                                loading={loading}
                                                size="large"
                                                block
                                            >
                                                Thanh toán qua VNPAY
                                            </Button>
                                        </div>
                                    </Form>
                                </div>

                                {/* 30% Phải: Tổng quan đơn hàng */}
                                <div className={cx('summary-card')}>
                                    <h3 className={cx('section-title')}>Tổng quan đơn hàng</h3>

                                    <div className={cx('coupon-section')}>
                                        {/* <h4 style={{ marginBottom: 10 }}>Mã giảm giá</h4> */}
                                        <div className={cx('coupon-row')}>
                                            {couponCode ? (
                                                <div className={cx('coupon-info')}>
                                                    <div className={cx('coupon-info-text')}>
                                                        <span className={cx('coupon-tag')}>{couponCode}</span>
                                                        <span className={cx('coupon-desc')}>Đã áp dụng</span>
                                                    </div>
                                                    <Button type="text" danger onClick={handleRemoveCoupon}>
                                                        Hủy
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Space.Compact style={{ width: '100%' }}>
                                                    <Select
                                                        placeholder="Chọn mã giảm giá"
                                                        style={{ width: '100%' }}
                                                        value={selectedCouponCode}
                                                        onChange={(value) => setSelectedCouponCode(value)}
                                                        optionLabelRender={(option) => {
                                                            const coupon = availableCoupons.find(c => c.code === option.value);
                                                            if (!coupon) return option.value;
                                                            return (
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                                    <span>{coupon.code}</span>
                                                                    <Tag color={coupon.type === 'PERCENT' ? 'blue' : 'green'}>
                                                                        {coupon.type === 'PERCENT'
                                                                            ? `${coupon.value}%`
                                                                            : coupon.value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                                                                    </Tag>
                                                                </div>
                                                            );
                                                        }}
                                                        options={availableCoupons.map((coupon) => ({
                                                            label: (
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '12px' }}>
                                                                    <div>
                                                                        <div style={{ fontWeight: '500' }}>{coupon.code}</div>
                                                                        {coupon.minOrderValue > 0 && (
                                                                            <div style={{ fontSize: '12px', color: '#999' }}>
                                                                                Đơn tối thiểu: {coupon.minOrderValue.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <Tag color={coupon.type === 'PERCENT' ? 'blue' : 'green'}>
                                                                        {coupon.type === 'PERCENT'
                                                                            ? `${coupon.value}%`
                                                                            : coupon.value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                                                                    </Tag>
                                                                </div>
                                                            ),
                                                            value: coupon.code,
                                                        }))}
                                                    />
                                                    <Button
                                                        type="primary"
                                                        onClick={() => handleApplyCoupon(selectedCouponCode)}
                                                        loading={applyingCoupon}
                                                        disabled={!selectedCouponCode}
                                                    >
                                                        Áp dụng
                                                    </Button>
                                                </Space.Compact>
                                            )}
                                        </div>
                                    </div>

                                    <Divider />

                                    <div className={cx('summary-row')}>
                                        <span>Tạm tính:</span>
                                        <span>{totalPrice.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</span>
                                    </div>

                                    {vipDiscountRate > 0 && vipDiscountAmount > 0 && (
                                        <div className={cx('summary-row', 'discount-row')} style={{ color: '#d69e2e' }}>
                                            <span>Ưu đãi hạng {vipTier === 'dong' ? 'Đồng' : vipTier === 'bac' ? 'Bạc' : vipTier === 'vang' ? 'Vàng' : vipTier === 'kimcuong' ? 'Kim Cương' : ''} ( - {vipDiscountRate}%):</span>
                                            <span>- {vipDiscountAmount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</span>
                                        </div>
                                    )}

                                    {discountAmount > 0 && (
                                        <div className={cx('summary-row', 'discount-row')}>
                                            <span>Giảm giá Voucher:</span>
                                            <span>- {discountAmount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</span>
                                        </div>
                                    )}

                                    <div className={cx('summary-row', 'total-row')}>
                                        <span>Thành tiền:</span>
                                        <span className={cx('total-price')}>
                                            {totalPriceAfterDiscount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                                        </span>
                                    </div>
                                    <p className={cx('tax-note')}>(Đã bao gồm VAT)</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default Cart;