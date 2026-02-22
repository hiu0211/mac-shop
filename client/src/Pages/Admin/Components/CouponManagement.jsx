import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Button, Card, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tag, message } from 'antd';
import { EditOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import {
    requestCreateCoupon,
    requestDeleteCoupon,
    requestGetCoupons,
    requestUpdateCoupon,
} from '../../../Config/request';

const { RangePicker } = DatePicker;
const { Search } = Input;

const CouponManagement = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [searchCode, setSearchCode] = useState('');
    const [form] = Form.useForm();

    const fetchCoupons = async () => {
        try {
            setLoading(true);
            const res = await requestGetCoupons();
            setCoupons(res.metadata || []);
        } catch (error) {
            console.error('Lỗi khi tải danh sách coupon:', error);
            message.error('Không thể tải danh sách mã giảm giá');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCoupons();
    }, []);

    const dataSource = useMemo(() => {
        const normalizedSearch = searchCode.trim().toLowerCase();
        return coupons
            .filter((item) =>
                normalizedSearch
                    ? (item.code || '').toLowerCase().includes(normalizedSearch)
                    : true,
            )
            .map((item) => ({
                key: item._id,
                id: item._id,
                code: item.code,
                type: item.type,
                value: item.value,
                minOrderValue: item.minOrderValue,
                maxDiscount: item.maxDiscount,
                totalUsageLimit: item.totalUsageLimit,
                perUserUsageLimit: item.perUserUsageLimit,
                usedCount: item.usedCount,
                startAt: item.startAt,
                endAt: item.endAt,
                status: item.status,
            }));
    }, [coupons, searchCode]);

    const handleOpenCreate = () => {
        setEditingCoupon(null);
        form.resetFields();
        setModalOpen(true);
    };

    const handleOpenEdit = (record) => {
        setEditingCoupon(record);
        form.setFieldsValue({
            code: record.code,
            type: record.type,
            value: record.value,
            minOrderValue: record.minOrderValue,
            maxDiscount: record.maxDiscount,
            totalUsageLimit: record.totalUsageLimit,
            perUserUsageLimit: record.perUserUsageLimit,
            dateRange: [record.startAt ? dayjs(record.startAt) : null, record.endAt ? dayjs(record.endAt) : null],
            status: record.status === 'ACTIVE',
        });
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            await requestDeleteCoupon(id);
            message.success('Xóa mã giảm giá thành công');
            fetchCoupons();
        } catch (error) {
            console.error('Lỗi khi xóa coupon:', error);
            message.error('Xóa mã giảm giá thất bại');
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const payload = {
                code: values.code,
                type: values.type,
                value: values.value,
                minOrderValue: values.minOrderValue || 0,
                maxDiscount: values.maxDiscount || 0,
                totalUsageLimit: values.totalUsageLimit || 0,
                perUserUsageLimit: values.perUserUsageLimit || 0,
                startAt: values.dateRange?.[0]?.toDate(),
                endAt: values.dateRange?.[1]?.toDate(),
                status: values.status ? 'ACTIVE' : 'INACTIVE',
            };

            if (editingCoupon) {
                await requestUpdateCoupon({ id: editingCoupon.id, ...payload });
                message.success('Cập nhật mã giảm giá thành công');
            } else {
                await requestCreateCoupon(payload);
                message.success('Tạo mã giảm giá thành công');
            }

            setModalOpen(false);
            form.resetFields();
            fetchCoupons();
        } catch (error) {
            if (error?.errorFields) {
                return;
            }
            console.error('Lỗi khi lưu coupon:', error);
            message.error(error?.response?.data?.message || 'Lưu mã giảm giá thất bại');
        }
    };

    const columns = [
        {
            title: 'Mã giảm giá',
            dataIndex: 'code',
            key: 'code',
        },
        {
            title: 'Loại giảm giá',
            dataIndex: 'type',
            key: 'type',
            render: (type) => (type === 'PERCENT' ? 'Phần trăm' : 'Cố định'),
        },
        {
            title: 'Giá trị',
            dataIndex: 'value',
            key: 'value',
            render: (value, record) =>
                record.type === 'PERCENT' ? `${value}%` : `${value.toLocaleString('vi-VN')} VND`,
        },
        {
            title: 'Giá trị tối thiểu',
            dataIndex: 'minOrderValue',
            key: 'minOrderValue',
            hidden: true,
            render: (value) => `${(value || 0).toLocaleString('vi-VN')} VND`,
        },
        {
            title: 'Giảm tối đa',
            dataIndex: 'maxDiscount',
            key: 'maxDiscount',
            hidden: true,
            render: (value, record) =>
                record.type === 'PERCENT' ? `${(value || 0).toLocaleString('vi-VN')} VND` : '-',
        },
        {
            title: 'Đã dùng',
            dataIndex: 'usedCount',
            key: 'usedCount',
            hidden: true,
            render: (value, record) =>
                record.totalUsageLimit && record.totalUsageLimit > 0
                    ? `${value}/${record.totalUsageLimit}`
                    : `${value}/Không giới hạn`,
        },
        {
            title: 'Giới hạn/user',
            dataIndex: 'perUserUsageLimit',
            key: 'perUserUsageLimit',
            hidden: true,
            render: (value) => (value && value > 0 ? value : 'Không giới hạn'),
        },
        {
            title: 'Thời gian áp dụng',
            key: 'dateRange',
            render: (_, record) => {
                const start = record.startAt ? new Date(record.startAt).toLocaleDateString('vi-VN') : '-';
                const end = record.endAt ? new Date(record.endAt).toLocaleDateString('vi-VN') : '-';
                return `${start} - ${end}`;
            },
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            align: 'center',
            render: (status) => (
                <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>{status === 'ACTIVE' ? 'Hoạt động' : 'Không hoạt động'}</Tag>
            ),
        },
        {
            title: 'Thao tác',
            key: 'action',
            align: 'center',
            render: (_, record) => (
                <Space size="middle">
                    <Button icon={<EditOutlined />} onClick={() => handleOpenEdit(record)}>
                    </Button>
                    <Popconfirm
                        title="Bạn có chắc muốn xóa mã giảm giá này?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Có"
                        cancelText="Không"
                    >
                        <Button danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Card title="Quản lý mã giảm giá">
                <Space>
                    <Search
                        placeholder="Tìm theo mã giảm giá"
                        allowClear
                        onChange={(event) => setSearchCode(event.target.value)}
                        value={searchCode}
                        style={{ minWidth: 350 }}
                    />
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
                        Thêm mới
                    </Button>
                </Space>
            </Card>

            <Table columns={columns} dataSource={dataSource} loading={loading} />

            <Modal
                title={editingCoupon ? 'Cập nhật mã giảm giá' : 'Thêm mới mã giảm giá'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={handleSubmit}
                okText="Lưu"
                cancelText="Hủy"
                width={800}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        label="Mã giảm giá"
                        name="code"
                        rules={[{ required: true, message: 'Vui lòng nhập mã giảm giá' }]}
                    >
                        <Input placeholder="Nhập mã giảm giá" />
                    </Form.Item>
                    <Form.Item
                        label="Loại giảm giá"
                        name="type"
                        rules={[{ required: true, message: 'Vui lòng chọn loại giảm giá' }]}
                    >
                        <Select
                            options={[
                                { label: 'Giảm theo phần trăm', value: 'PERCENT' },
                                { label: 'Giảm theo số tiền', value: 'FIXED' },
                            ]}
                            placeholder="Chọn loại giảm giá"
                        />
                    </Form.Item>
                    <Form.Item
                        label="Giá trị"
                        name="value"
                        rules={[{ required: true, message: 'Vui lòng nhập giá trị' }]}
                    >
                        <InputNumber min={1} style={{ width: '100%' }} placeholder='Nhập giá trị giảm giá'/>
                    </Form.Item>
                    <Form.Item label="Giá trị đơn hàng tối thiểu" name="minOrderValue" initialValue={0} hidden>
                        <InputNumber min={0} style={{ width: '100%' }} placeholder='Nhập giá trị đơn hàng tối thiểu'/>
                    </Form.Item>
                    <Form.Item label="Giá trị giảm tối đa" name="maxDiscount" initialValue={0} hidden>
                        <InputNumber min={0} style={{ width: '100%' }} placeholder='Nhập giá trị giảm tối đa'/>
                    </Form.Item>
                    <Form.Item label="Giới hạn tổng số lần sử dụng" name="totalUsageLimit" initialValue={0} hidden>
                        <InputNumber min={0} style={{ width: '100%' }} placeholder='Nhập giới hạn tổng số lần sử dụng'/>
                    </Form.Item>
                    <Form.Item label="Giới hạn người dùng" name="perUserUsageLimit" initialValue={0} hidden>
                        <InputNumber min={0} style={{ width: '100%' }} placeholder='Nhập số lượng giới hạn'/>
                    </Form.Item>
                    <Form.Item
                        label="Thời gian áp dụng"
                        name="dateRange"
                        rules={[{ required: true, message: 'Vui lòng chọn thời gian áp dụng' }]}
                    >
                        <RangePicker style={{ width: '100%' }} placeholder={['Ngày bắt đầu', 'Ngày kết thúc']} />
                    </Form.Item>
                    <Form.Item label="Trạng thái" name="status" valuePropName="checked" initialValue={true}>
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default CouponManagement;
