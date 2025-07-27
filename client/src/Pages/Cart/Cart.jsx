import classNames from 'classnames/bind';
import styles from './Cart.module.scss';
import Header from '../../Components/Header/Header';

import { Button, Table, Form, Input, AutoComplete } from 'antd';
import { useEffect, useState } from 'react';
import { requestDeleteCart, requestGetCart, requestPayment, requestUpdateInfoUserCart } from '../../Config/request';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';

const cx = classNames.bind(styles);

function Cart() {
    const [cart, setCart] = useState([]);
    const [totalPrice, setTotalPrice] = useState(0);
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [addressOptions, setAddressOptions] = useState([]);

    const fetchCart = async () => {
        const res = await requestGetCart();
        setCart(res.metadata.newData.data);
        setTotalPrice(res.metadata.newData.totalPrice);
    };

    useEffect(() => {
        fetchCart();
    }, []);

    const dataSource = cart.map((item) => ({
        key: item._id,
        id: item._id,
        name: item.name,
        image: item.images[0],
        price: item.price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }),
        quantity: item.quantity,
    }));

    const handleDelete = async (productId) => {
        try {
            await requestDeleteCart(productId);
            await fetchCart();
            message.success('Xóa sản phẩm thành công');
        } catch (error) {
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
                case 'COD':
                    const codRes = await requestPayment(typePayment);
                    navigate(`/payment/${codRes.metadata}`);
                    break;
                case 'MOMO':
                    const momoRes = await requestPayment(typePayment);
                    window.open(momoRes.metadata.payUrl, '_blank');
                    break;
                case 'VNPAY':
                    const vnpayRes = await requestPayment(typePayment);
                    window.open(vnpayRes.metadata, '_blank');
                    break;
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
                        <Table dataSource={dataSource} columns={columns} pagination={false} />
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
                                    <Input placeholder="Nhập địa chỉ" />
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
                                        onClick={() => handlePayments('MOMO')}
                                        className={cx('payment-btn-momo')}
                                        loading={loading}
                                    >
                                        Thanh toán qua MOMO
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
