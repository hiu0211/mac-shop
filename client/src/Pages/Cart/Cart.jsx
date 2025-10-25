import classNames from 'classnames/bind';
import styles from './Cart.module.scss';
import Header from '../../Components/Header/Header';
import { Button, Table, Form, Input, AutoComplete, InputNumber } from 'antd';
import { useEffect, useState } from 'react';
import { requestDeleteCart, requestGetCart, requestPayment, requestUpdateInfoUserCart, requestUpdateQuantityCart } from '../../Config/request';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useDebounce from '../../hooks/useDebounce';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';

const cx = classNames.bind(styles);

function Cart() {
    const [cart, setCart] = useState([]);
    const [totalPrice, setTotalPrice] = useState(0);
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [updatingQuantity, setUpdatingQuantity] = useState({});
    
    // States cho Autocomplete địa chỉ
    const [addressOptions, setAddressOptions] = useState([]);
    const [valueAddress, setValueAddress] = useState('');
    
    // Debounce để tối ưu API calls
    const debounce = useDebounce(valueAddress, 800);

    const fetchCart = async () => {
        const res = await requestGetCart();
        setCart(res.metadata.newData.data);
        setTotalPrice(res.metadata.newData.totalPrice);
    };

    useEffect(() => {
        fetchCart();
    }, []);

    // Fetch địa chỉ từ Goong API
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

    // Hàm cập nhật số lượng
    const handleUpdateQuantity = async (productId, newQuantity) => {
        // Validate input
        if (!newQuantity || newQuantity < 1) {
            message.warning('Số lượng phải lớn hơn 0');
            return;
        }

        // Kiểm tra nếu số lượng không thay đổi thì không gọi API
        const currentProduct = cart.find(item => item._id === productId);
        if (currentProduct && currentProduct.quantity === newQuantity) {
            return;
        }

        try {
            setUpdatingQuantity(prev => ({ ...prev, [productId]: true }));
            await requestUpdateQuantityCart(productId, newQuantity);
            await fetchCart();
            message.success('Cập nhật số lượng thành công');
        } catch (error) {
            console.error(error);
            message.error(error.response?.data?.message || 'Cập nhật số lượng thất bại');
            // Reload lại giỏ hàng để đồng bộ dữ liệu nếu có lỗi
            await fetchCart();
        } finally {
            setUpdatingQuantity(prev => ({ ...prev, [productId]: false }));
        }
    };

    const dataSource = cart.map((item) => ({
        key: item._id,
        id: item._id,
        name: item.name,
        image: item.images[0],
        price: item.price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }),
        quantity: item.quantity,
        stock: item.stock,
    }));

    const handleDelete = async (productId) => {
        try {
            await requestDeleteCart(productId);
            await fetchCart();
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
            };

            await requestUpdateInfoUserCart(data);
            return;
        } catch (error) {
            console.error(error);
            message.error('Cập nhật thông tin thất bại');
        } finally {
            setLoading(false);
        }
    };

    const navigate = useNavigate();

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            align: 'center',
            hidden: true,
        },
        {
            title: 'STT',
            dataIndex: 'stt',
            key: 'stt',
            width: '60px',
            render: (_, __, index) => index + 1,
        },
        {
            title: 'Tên sản phẩm',
            dataIndex: 'name',
            key: 'name',
            align: 'center',
        },
        {
            title: 'Hình ảnh',
            dataIndex: 'image',
            key: 'image',
            align: 'center',
            render: (image) => <img src={image} alt="product" style={{ width: '100px', height: '100px' }} />,
        },
        {
            title: 'Giá',
            dataIndex: 'price',
            key: 'price',
            align: 'center',
        },
        {
            title: 'Số lượng',
            dataIndex: 'quantity',
            key: 'quantity',
            align: 'center',
            render: (quantity, record) => (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Button
                        size="small"
                        icon={<MinusOutlined />}
                        onClick={() => handleUpdateQuantity(record.id, quantity - 1)}
                        disabled={quantity <= 1 || updatingQuantity[record.id]}
                    />
                    <InputNumber
                        min={1}
                        max={record.stock + quantity}
                        value={quantity}
                        onChange={(value) => handleUpdateQuantity(record.id, value)}
                        disabled={updatingQuantity[record.id]}
                        style={{ width: '50px' }}
                    />
                    <Button
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => handleUpdateQuantity(record.id, quantity + 1)}
                        disabled={updatingQuantity[record.id]}
                    />
                </div>
            ),
        },
        {
            title: 'Hành động',
            dataIndex: 'action',
            key: 'action',
            align: 'center',
            render: (_, record) => (
                <Button onClick={() => handleDelete(record.id)} type="primary" danger>
                    Xóa
                </Button>
            ),
        },
    ];

    const handlePayments = async (typePayment) => {
        try {
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
            if (error.errorFields) {
                message.error('Vui lòng điền đầy đủ thông tin thanh toán');
            } else {
                message.error('Có lỗi xảy ra khi thanh toán');
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

    return (
        <div className={cx('wrapper')}>
            <header>
                <Header />
            </header>

            <main className={cx('main')}>
                <div className={cx('container')}>
                    <div className={cx('cart-header')}>
                        <h4>Giỏ hàng</h4>
                        <h4>Tổng giá: {totalPrice.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</h4>
                    </div>

                    <div className={cx('cart-content')}>
                        <Table bordered dataSource={dataSource} columns={columns} pagination={false} />
                    </div>
                    {cart.length > 0 && (
                        <div className={cx('checkout-form')}>
                            <h4>Thông tin thanh toán</h4>
                            <Form form={form} layout="vertical" onFinish={handleSubmit}>
                                <Form.Item
                                    label="Họ và tên"
                                    name="fullName"
                                    rules={[{ required: true, message: 'Vui lòng nhập họ và tên!' }]}
                                >
                                    <Input placeholder="Nhập họ và tên" />
                                </Form.Item>

                                <Form.Item
                                    label="Số điện thoại"
                                    name="phone"
                                    rules={[
                                        { required: true, message: 'Vui lòng nhập số điện thoại!' },
                                        { pattern: /^[0-9]{10}$/, message: 'Số điện thoại không hợp lệ!' },
                                    ]}
                                >
                                    <Input placeholder="Nhập số điện thoại" />
                                </Form.Item>

                                <Form.Item
                                    label="Địa chỉ"
                                    name="address"
                                    rules={[{ required: true, message: 'Vui lòng nhập địa chỉ!' }]}
                                >
                                    <AutoComplete
                                        options={addressOptions}
                                        onSearch={handleAddressSearch}
                                        onSelect={handleAddressSelect}
                                        placeholder="Nhập địa chỉ"
                                        filterOption={false}
                                        notFoundContent={valueAddress ? "Đang tìm kiếm..." : null}
                                    />
                                </Form.Item>

                                <div className={cx('payment-btn')}>
                                    <Button
                                        onClick={() => handlePayments('COD')}
                                        className={cx('submit-btn')}
                                        loading={loading}
                                    >
                                        Thanh toán khi nhận hàng
                                    </Button>
                                    
                                    <Button
                                        onClick={() => handlePayments('VNPAY')}
                                        className={cx('payment-btn-vnpay')}
                                        loading={loading}
                                    >
                                        Thanh toán qua VNPAY
                                    </Button>
                                </div>
                            </Form>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default Cart;