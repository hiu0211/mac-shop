import React, { useEffect, useState } from 'react';
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Space, Table, Tag, Tooltip, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, BgColorsOutlined } from '@ant-design/icons';
import {
    requestCreateVipTier,
    requestDeleteVipTier,
    requestGetAdminVipTiers,
    requestUpdateVipTier,
} from '../../../Config/request';

/**
 * Ma trận bảng màu 5 hàng x 11 cột theo mẫu
 */
const COLOR_PALETTE_GRID = [
    // Hàng 1: Tông tươi sáng
    ['#ff6b6b', '#ff922b', '#fcc419', '#94d82d', '#51cf66', '#20c997', '#22b8cf', '#339af0', '#f06595', '#cc5de8', '#868e96'],
    // Hàng 2: Pastel rất nhạt
    ['#ffe3e3', '#ffe8cc', '#fff3bf', '#e9fac8', '#d3f9d8', '#c5f6fa', '#e7f5ff', '#edf2ff', '#fcc2d7', '#f3d9fa', '#f1f3f5'],
    // Hàng 3: Pastel nhạt vừa
    ['#ffc9c9', '#ffd8a8', '#ffec99', '#d8f5a2', '#b2f2bb', '#96f2d7', '#a5d8ff', '#bac8ff', '#faa2c1', '#eebefa', '#e9ecef'],
    // Hàng 4: Rực rỡ
    ['#f03e3e', '#fd7e14', '#f59f00', '#82c91e', '#40c057', '#12b886', '#15aabf', '#4c6ef5', '#e64980', '#9c36b5', '#495057'],
    // Hàng 5: Tông đậm
    ['#c92a2a', '#d9480f', '#e67700', '#5c940d', '#2b8a3e', '#0ca678', '#0b7285', '#1c7ed6', '#a61e4d', '#7950f2', '#343a40'],
];

const VipTierManagement = () => {
    const [tiers, setTiers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTier, setEditingTier] = useState(null);
    const [selectedColor, setSelectedColor] = useState('#1890ff');

    const [form] = Form.useForm();

    const fetchTiers = async () => {
        try {
            setLoading(true);
            const res = await requestGetAdminVipTiers();
            setTiers(res.metadata || []);
        } catch (error) {
            console.error('Error fetching VIP tiers:', error);
            message.error('Không thể tải danh sách bậc hạng VIP');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTiers();
    }, []);

    const handleOpenAddModal = () => {
        setEditingTier(null);
        const defaultColor = '#ff922b';
        setSelectedColor(defaultColor);
        form.resetFields();
        form.setFieldsValue({
            color: defaultColor,
            minSpending: 0,
            discountRate: 0,
        });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (record) => {
        setEditingTier(record);
        const colorVal = record.color || '#8c8c8c';
        setSelectedColor(colorVal);
        form.resetFields();
        form.setFieldsValue({
            name: record.name,
            minSpending: record.minSpending,
            discountRate: record.discountRate,
            color: colorVal,
        });
        setIsModalOpen(true);
    };

    const handleSelectColor = (colorHex) => {
        setSelectedColor(colorHex);
        form.setFieldsValue({ color: colorHex });
    };

    const handleSubmit = async (values) => {
        try {
            setSaving(true);
            if (editingTier) {
                await requestUpdateVipTier(editingTier._id, values);
                message.success('Cập nhật bậc hạng VIP thành công');
            } else {
                await requestCreateVipTier(values);
                message.success('Thêm bậc hạng VIP thành công');
            }
            setIsModalOpen(false);
            fetchTiers();
        } catch (error) {
            console.error('Error saving VIP tier:', error);
            message.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu bậc hạng');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await requestDeleteVipTier(id);
            message.success('Xóa bậc hạng VIP thành công');
            fetchTiers();
        } catch (error) {
            console.error('Error deleting VIP tier:', error);
            message.error(error.response?.data?.message || 'Không thể xóa bậc hạng');
        }
    };

    const columns = [
        {
            title: 'STT',
            key: 'index',
            width: 70,
            align: 'center',
            render: (_, __, idx) => idx + 1,
        },
        {
            title: 'Tên bậc hạng',
            dataIndex: 'name',
            key: 'name',
        },
        // {
        //     title: 'Mã Hạng (Key)',
        //     dataIndex: 'key',
        //     key: 'key',
        //     render: (key, record) => (
        //         <Tag
        //             color={record.color || 'default'}
        //             style={{
        //                 fontWeight: '600',
        //                 fontSize: '13px',
        //                 padding: '4px 10px',
        //                 borderRadius: '4px',
        //                 border: '1px solid rgba(0,0,0,0.1)',
        //             }}
        //         >
        //             {key}
        //         </Tag>
        //     ),
        // },
        {
            title: 'Mức chi tiêu tối thiểu',
            dataIndex: 'minSpending',
            key: 'minSpending',
            render: (amount) => (
                <span style={{ fontWeight: '600', color: '#389e0d' }}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0)}
                </span>
            ),
        },
        {
            title: '% Giảm giá',
            dataIndex: 'discountRate',
            key: 'discountRate',
            render: (rate) => <Tag color="blue" style={{ fontSize: '13px', fontWeight: 'bold' }}>{rate}%</Tag>,
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 150,
            align: 'center',
            render: (_, record) => (
                <Space size="middle">
                    <Tooltip title="Chỉnh sửa">
                        <Button
                            type="primary"
                            ghost
                            icon={<EditOutlined />}
                            onClick={() => handleOpenEditModal(record)}
                        />
                    </Tooltip>
                    {record.key !== 'none' ? (
                        <Popconfirm
                            title="Xóa bậc hạng này?"
                            description="Tất cả khách hàng đang ở hạng này sẽ được chuyển về hạng Thành viên."
                            onConfirm={() => handleDelete(record._id)}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                        >
                            <Tooltip title="Xóa">
                                <Button danger icon={<DeleteOutlined />} />
                            </Tooltip>
                        </Popconfirm>
                    ) : (
                        <Tooltip title="Hạng mặc định không được xóa">
                            <Button disabled icon={<DeleteOutlined />} />
                        </Tooltip>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Card
                title={<span style={{ fontSize: '18px', fontWeight: 'bold' }}>Quản lý Bậc Hạng</span>}
                extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddModal}>
                        Thêm bậc hạng mới
                    </Button>
                }
                bordered={false}
                style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
            >
                <Table
                    columns={columns}
                    dataSource={tiers.map((t) => ({ ...t, keyRow: t._id }))}
                    rowKey="_id"
                    loading={loading}
                    pagination={false}
                />
            </Card>

            <Modal
                title={editingTier ? 'Chỉnh sửa bậc hạng VIP' : 'Thêm bậc hạng VIP mới'}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={() => form.submit()}
                confirmLoading={saving}
                okText={editingTier ? 'Cập nhật' : 'Tạo mới'}
                cancelText="Hủy"
                destroyOnClose
                width={540}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: '16px' }}>
                    <Form.Item
                        name="name"
                        label="Tên bậc hạng"
                        rules={[{ required: true, message: 'Vui lòng nhập tên bậc hạng' }]}
                    >
                        <Input placeholder="Nhập tên bậc hạng (Ví dụ: Kim Cương, Bạch Kim...)" />
                    </Form.Item>

                    <Form.Item
                        name="minSpending"
                        label="Mức chi tiêu tối thiểu (VNĐ)"
                        rules={[{ required: true, message: 'Vui lòng nhập mức chi tiêu tối thiểu' }]}
                    >
                        <InputNumber
                            style={{ width: '100%' }}
                            min={0}
                            step={1000000}
                            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                            placeholder="Ví dụ: 50,000,000"
                        />
                    </Form.Item>

                    <Form.Item
                        name="discountRate"
                        label="Tỷ lệ giảm giá (%)"
                        rules={[{ required: true, message: 'Vui lòng nhập tỷ lệ giảm giá' }]}
                    >
                        <InputNumber style={{ width: '100%' }} min={0} max={100} placeholder="Ví dụ: 10" />
                    </Form.Item>

                    <Form.Item
                        name="color"
                        label={
                            <Space>
                                <BgColorsOutlined style={{ color: '#1890ff' }} />
                                <span>Bảng màu</span>
                            </Space>
                        }
                        rules={[{ required: true, message: 'Vui lòng chọn màu sắc' }]}
                    >
                        <div
                            style={{
                                background: '#f8f9fa',
                                padding: '14px 16px',
                                borderRadius: '10px',
                                border: '1px solid #e9ecef',
                            }}
                        >
                            {/* Ma trận bảng màu 5 hàng x 11 cột */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {COLOR_PALETTE_GRID.map((rowColors, rowIndex) => (
                                    <div
                                        key={rowIndex}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(11, 1fr)',
                                            gap: '8px',
                                        }}
                                    >
                                        {rowColors.map((colorHex) => {
                                            const isSelected = selectedColor?.toLowerCase() === colorHex.toLowerCase();
                                            return (
                                                <div
                                                    key={colorHex}
                                                    onClick={() => handleSelectColor(colorHex)}
                                                    title={colorHex}
                                                    style={{
                                                        aspectRatio: '1',
                                                        borderRadius: '6px',
                                                        backgroundColor: colorHex,
                                                        cursor: 'pointer',
                                                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                                        boxShadow: isSelected
                                                            ? `0 0 0 2px #fff, 0 0 0 4px #339af0, 0 2px 5px rgba(0,0,0,0.2)`
                                                            : '0 1px 3px rgba(0,0,0,0.12)',
                                                        transform: isSelected ? 'scale(1.12)' : 'scale(1)',
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>

                            {/* Tùy chỉnh trực tiếp mã Hex */}
                            <div
                                style={{
                                    marginTop: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    paddingTop: '10px',
                                    borderTop: '1px dashed #dee2e6',
                                }}
                            >
                                <span style={{ fontSize: '13px', color: '#6c757d', fontWeight: '500' }}>
                                    Mã màu chọn:
                                </span>
                                <input
                                    type="color"
                                    value={selectedColor || '#1890ff'}
                                    onChange={(e) => handleSelectColor(e.target.value)}
                                    style={{
                                        width: '28px',
                                        height: '28px',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        background: 'transparent',
                                    }}
                                />
                                <Input
                                    value={selectedColor}
                                    onChange={(e) => handleSelectColor(e.target.value)}
                                    placeholder="#1890ff"
                                    style={{ width: '120px', fontWeight: '600', fontFamily: 'monospace' }}
                                />
                                <span
                                    style={{
                                        display: 'inline-block',
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '5px',
                                        backgroundColor: selectedColor || '#1890ff',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                                    }}
                                />
                            </div>
                        </div>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default VipTierManagement;
