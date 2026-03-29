import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, Modal, Popconfirm, Space, Switch, Table, Tag, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
    requestCreateBrand,
    requestDeleteBrand,
    requestGetAdminBrands,
    requestUpdateBrand,
} from '../../../Config/request';

const { Search, TextArea } = Input;

const BrandManagement = () => {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState(null);

    const [form] = Form.useForm();

    const fetchBrands = async () => {
        try {
            setLoading(true);
            const res = await requestGetAdminBrands();
            setBrands(res.metadata || []);
        } catch (error) {
            console.error('Lỗi khi tải danh sách hãng điện thoại:', error);
            message.error('Không thể tải danh sách hãng điện thoại');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBrands();
    }, []);

    const dataSource = useMemo(() => {
        const normalizedSearchText = searchText.trim().toLowerCase();

        return (brands || [])
            .filter((item) => {
                if (!normalizedSearchText) return true;
                return (item.name || '').toLowerCase().includes(normalizedSearchText);
            })
            .map((item) => ({
                key: item._id,
                id: item._id,
                name: item.name,
                description: item.description,
                isActive: item.isActive,
                createdAt: item.createdAt,
            }));
    }, [brands, searchText]);

    const handleOpenCreate = () => {
        setEditingBrand(null);
        form.resetFields();
        form.setFieldsValue({
            isActive: true,
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (record) => {
        setEditingBrand(record);
        form.setFieldsValue({
            name: record.name,
            description: record.description,
            isActive: record.isActive,
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            await requestDeleteBrand(id);
            message.success('Xóa hãng điện thoại thành công');
            fetchBrands();
        } catch (error) {
            console.error('Lỗi khi xóa hãng điện thoại:', error);
            message.error(error?.response?.data?.message || 'Xóa hãng điện thoại thất bại');
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);

            const payload = {
                name: values.name,
                description: values.description || '',
                isActive: !!values.isActive,
            };

            if (editingBrand) {
                await requestUpdateBrand({ id: editingBrand.id, ...payload });
                message.success('Cập nhật hãng điện thoại thành công');
            } else {
                await requestCreateBrand(payload);
                message.success('Thêm hãng điện thoại thành công');
            }

            setIsModalOpen(false);
            form.resetFields();
            fetchBrands();
        } catch (error) {
            if (error?.errorFields) {
                return;
            }
            console.error('Lỗi khi lưu hãng điện thoại:', error);
            message.error(error?.response?.data?.message || 'Lưu hãng điện thoại thất bại');
        } finally {
            setSaving(false);
        }
    };

    const columns = [
        {
            title: 'Tên hãng',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
        // {
        //     title: 'Mô tả',
        //     dataIndex: 'description',
        //     key: 'description',
        //     render: (description) => description || '-',
        // },
        {
            title: 'Trạng thái',
            dataIndex: 'isActive',
            key: 'isActive',
            align: 'center',
            render: (isActive) => (
                <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Hoạt động' : 'Khóa'}</Tag>
            ),
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (createdAt) => (createdAt ? new Date(createdAt).toLocaleDateString('vi-VN') : '-'),
        },
        {
            title: 'Thao tác',
            key: 'action',
            align: 'center',
            render: (_, record) => (
                <Space size="middle">
                    <Button icon={<EditOutlined />} onClick={() => handleOpenEdit(record)} />
                    <Popconfirm
                        title="Bạn có chắc muốn xóa hãng điện thoại này?"
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
            <Card title="Quản lý hãng điện thoại">
                <Space>
                    <Search
                        placeholder="Tìm theo tên hãng"
                        allowClear
                        value={searchText}
                        onChange={(event) => setSearchText(event.target.value)}
                        style={{ minWidth: 320 }}
                    />
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
                        Thêm hãng
                    </Button>
                </Space>
            </Card>

            <Table columns={columns} dataSource={dataSource} loading={loading} />

            <Modal
                title={editingBrand ? 'Cập nhật hãng điện thoại' : 'Thêm mới hãng điện thoại'}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={handleSubmit}
                okText="Lưu"
                cancelText="Hủy"
                confirmLoading={saving}
            >
                <Form form={form} layout="vertical" initialValues={{ isActive: true }}>
                    <Form.Item
                        label="Tên hãng"
                        name="name"
                        rules={[{ required: true, message: 'Vui lòng nhập tên hãng điện thoại' }]}
                    >
                        <Input placeholder="Vi du: Apple" />
                    </Form.Item>

                    <Form.Item label="Mô tả" name="description">
                        <TextArea rows={3} placeholder="Nhập mô tả cho hãng điện thoại" />
                    </Form.Item>

                    <Form.Item label="Trạng thái" name="isActive" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default BrandManagement;
