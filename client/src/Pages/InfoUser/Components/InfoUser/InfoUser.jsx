import classNames from 'classnames/bind';
import styles from './InfoUser.module.scss';

import { Button, Input, message } from 'antd';
import { Table } from 'antd';
import { useStore } from '../../../../hooks/useStore';
import { useEffect, useState } from 'react';
import { requestGetHistoryOrder, requestUpdateInfoUser, requestUpdatePassword } from '../../../../Config/request';
import ModalUpdatePassword from './ModalUpdatePassword/ModalUpdatePassword';

const cx = classNames.bind(styles);

const columns = [
    {
        title: 'ID',
        dataIndex: 'orderId',
        key: 'orderId',
        width: '15%',
        ellipsis: true,
    },
    {
        title: 'Tên sản phẩm',
        dataIndex: 'products',
        key: 'products',
        render: (products) => products[0].name,
    },
    {
        title: 'Giá',
        dataIndex: 'products',
        key: 'price',
        render: (products) => products[0]?.price?.toLocaleString('vi-VN') + ' đ',
    },
    {
        title: 'Số lượng',
        dataIndex: 'products',
        key: 'quantity',
        render: (products) => products[0]?.quantity,
    },
    {
        title: 'Địa chỉ',
        dataIndex: 'address',
        key: 'address',
    },
    {
        title: 'Trạng thái',
        dataIndex: 'statusOrder',
        key: 'statusOrder',
        render: (status) => {
            let color = '';
            let text = '';

            switch (status) {
                case 'pending':
                    color = '#faad14'; // màu vàng
                    text = 'Đang xử lý';
                    break;
                case 'completed':
                    color = '#1677ff'; // màu xanh dương
                    text = 'Đã xác nhận';
                    break;
                case 'shipping':
                    color = '#722ed1'; // màu tím
                    text = 'Đang vận chuyển';
                    break;
                case 'delivered':
                    color = '#52c41a'; // màu xanh lá
                    text = 'Đã giao hàng';
                    break;
                case 'cancelled':
                    color = '#ff4d4f'; // màu đỏ
                    text = 'Đã hủy';
                    break;
                default:
                    color = '#000000';
                    text = status;
            }

            return (
                <span
                    style={{
                        color: color,
                        fontWeight: 600,
                    }}
                >
                    {text}
                </span>
            );
        },
    },
    {
        title: 'Phương thức',
        dataIndex: 'typePayments',
        key: 'typePayments',
    },
    {
        title: 'Ngày đặt',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (date) => new Date(date).toLocaleDateString('vi-VN'),
    },
];

function InfoUser({ isOpen, setIsOpen }) {
    const { dataUser } = useStore();

    const [fullName, setFullName] = useState(dataUser.fullName);
    const [email, setEmail] = useState(dataUser.email);
    const [phone, setPhone] = useState(dataUser.phone);
    const [address, setAddress] = useState(dataUser.address || 'Chưa cập nhật');

    useEffect(() => {
        setFullName(dataUser.fullName);
        setEmail(dataUser.email);
        setPhone(dataUser.phone);
        setAddress(dataUser.address || 'Chưa cập nhật');
    }, [dataUser]);

    const handleUpdateInfoUser = async () => {
        try {
            const data = {
                fullName,
                email,
                phone,
                address,
            };
            await requestUpdateInfoUser(data);
            message.success('Cập nhật thông tin người dùng thành công');
            window.location.reload();
        } catch (error) {
            message.error('Cập nhật thông tin người dùng thất bại');
        }
    };

    const [dataOrder, setDataOrder] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            const res = await requestGetHistoryOrder();
            setDataOrder(res.metadata.orders);
        };
        fetchData();
    }, []);

    return (
        <div className={cx('wrapper')}>
            <h5>Thông tin cá nhân</h5>
            <div className={cx('form')}>
                <Input
                    size="large"
                    placeholder="Họ và tên"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                />
                <Input size="large" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input
                    size="large"
                    placeholder="Số điện thoại"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                />
            </div>
            <Button onClick={handleUpdateInfoUser} className={cx('btn')} type="primary" size="large">
                Cập nhật
            </Button>
            <h5>Đơn hàng</h5>
            <div className={cx('table')}>
                <Table dataSource={dataOrder} columns={columns} rowKey="orderId" pagination={false} />
            </div>
            <ModalUpdatePassword isOpen={isOpen} setIsOpen={setIsOpen} />
        </div>
    );
}

export default InfoUser;
