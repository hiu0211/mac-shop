import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, Modal, Popconfirm, Space, Switch, Table, Tag, Upload, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import {
    requestCreateBrand,
    requestDeleteBrand,
    requestGetAdminBrands,
    requestUpdateBrand,
    requestUploadImage,
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
    const [logoFileList, setLogoFileList] = useState([]);
    const [logoUrl, setLogoUrl] = useState('');

    // ─── Data fetching ────────────────────────────────────────────────────────

    const fetchBrands = async () => {
        try {
            setLoading(true);
            const res = await requestGetAdminBrands();
            setBrands(res.metadata || []);
        } catch (error) {
            console.error('Error fetching brands:', error);
            message.error('Không thể tải danh sách hãng sản xuất');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBrands();
    }, []);

    // ─── Table data ───────────────────────────────────────────────────────────

    const dataSource = useMemo(() => {
        const keyword = searchText.trim().toLowerCase();
        return (brands || [])
            .filter((item) => !keyword || (item.name || '').toLowerCase().includes(keyword))
            .map((item) => ({
                key: item._id,
                id: item._id,
                name: item.name,
                description: item.description,
                logo: item.logo || '',
                isActive: item.isActive,
                createdAt: item.createdAt,
            }));
    }, [brands, searchText]);

    // ─── Modal helpers ────────────────────────────────────────────────────────

    const resetLogoState = () => {
        setLogoFileList([]);
        setLogoUrl('');
    };

    const handleOpenCreate = () => {
        setEditingBrand(null);
        form.resetFields();
        form.setFieldsValue({ isActive: true });
        resetLogoState();
        setIsModalOpen(true);
    };

    const handleOpenEdit = (record) => {
        setEditingBrand(record);
        form.setFieldsValue({
            name: record.name,
            description: record.description,
            isActive: record.isActive,
        });
        if (record.logo) {
            setLogoFileList([{ uid: record.id || '-1', name: 'logo', status: 'done', url: record.logo }]);
            setLogoUrl(record.logo);
        } else {
            resetLogoState();
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        resetLogoState();
        form.resetFields();
    };

    // ─── CRUD actions ─────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);

            const payload = {
                name: values.name,
                description: values.description || '',
                isActive: !!values.isActive,
                logo: logoUrl || '',
            };

            if (editingBrand) {
                await requestUpdateBrand({ id: editingBrand.id, ...payload });
                message.success('Cập nhật hãng sản xuất thành công');
            } else {
                await requestCreateBrand(payload);
                message.success('Thêm hãng sản xuất thành công');
            }

            handleCloseModal();
            fetchBrands();
        } catch (error) {
            if (error?.errorFields) return;
            message.error(error?.response?.data?.message || 'Lưu hãng sản xuất thất bại');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await requestDeleteBrand(id);
            message.success('Xóa hãng sản xuất thành công');
            fetchBrands();
        } catch (error) {
            message.error(error?.response?.data?.message || 'Xóa hãng sản xuất thất bại');
        }
    };

    // ─── Logo upload ──────────────────────────────────────────────────────────

    const handleUploadLogo = async ({ file, onSuccess, onError }) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

        if (!allowedTypes.includes(file.type)) {
            message.error('Chỉ chấp nhận ảnh JPG, JPEG, PNG, WEBP');
            onError?.('Invalid file type');
            return;
        }

        if (file.size / 1024 / 1024 > 2) {
            message.error('Kích thước tối đa là 2MB');
            onError?.('File too large');
            return;
        }

        setLogoFileList([{ uid: file.uid, name: file.name, status: 'uploading' }]);

        try {
            const formData = new FormData();
            formData.append('images', file);
            formData.append('folder', 'mac-shop/brands');

            const res = await requestUploadImage(formData);
            const uploadedUrl = res?.metadata?.[0] || '';

            if (!uploadedUrl) throw new Error('Không nhận được URL ảnh');

            setLogoUrl(uploadedUrl);
            setLogoFileList([{ uid: file.uid, name: file.name, status: 'done', url: uploadedUrl }]);
            message.success('Tải ảnh thành công');
            onSuccess?.(null);
        } catch (error) {
            resetLogoState();
            message.error('Tải ảnh thất bại');
            onError?.(error);
        }
    };

    const handleRemoveLogo = () => {
        resetLogoState();
    };

    // ─── Table columns ────────────────────────────────────────────────────────

    const columns = [
        {
            title: 'Logo',
            dataIndex: 'logo',
            key: 'logo',
            align: 'center',
            width: 80,
            render: (logo, record) =>
                logo ? (
                    <img
                        src={logo}
                        alt={record.name}
                        style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4 }}
                    />
                ) : (
                    <span style={{ color: '#bbb' }}>—</span>
                ),
        },
        {
            title: 'Tên hãng',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
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
            render: (val) => (val ? new Date(val).toLocaleDateString('vi-VN') : '—'),
        },
        {
            title: 'Thao tác',
            key: 'action',
            align: 'center',
            render: (_, record) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => handleOpenEdit(record)} />
                    <Popconfirm
                        title="Bạn có chắc muốn xóa hãng sản xuất này?"
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

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div>
            <Card
                title="Quản lý hãng sản xuất"
                extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
                        Thêm hãng
                    </Button>
                }
            >
                <Search
                    placeholder="Tìm theo tên hãng"
                    allowClear
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: 350 }}
                />
            </Card>

            <Table columns={columns} dataSource={dataSource} loading={loading} />

            <Modal
                title={editingBrand ? 'Cập nhật hãng sản xuất' : 'Thêm mới hãng sản xuất'}
                open={isModalOpen}
                onCancel={handleCloseModal}
                onOk={handleSubmit}
                okText="Lưu"
                cancelText="Hủy"
                confirmLoading={saving}
                destroyOnClose
            >
                <Form form={form} layout="vertical" initialValues={{ isActive: true }}>
                    <Form.Item
                        label="Tên hãng"
                        name="name"
                        rules={[{ required: true, message: 'Vui lòng nhập tên hãng sản xuất' }]}
                    >
                        <Input placeholder="Ví dụ: Apple" />
                    </Form.Item>

                    <Form.Item label="Mô tả" name="description">
                        <TextArea rows={3} placeholder="Nhập mô tả cho hãng sản xuất" />
                    </Form.Item>

                    <Form.Item label="Logo">
                        <Upload
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            listType="picture-card"
                            fileList={logoFileList}
                            customRequest={handleUploadLogo}
                            onRemove={handleRemoveLogo}
                            maxCount={1}
                        >
                            {logoFileList.length >= 1 ? null : (
                                <div>
                                    <UploadOutlined style={{ fontSize: 24 }} />
                                    <div style={{ marginTop: 8 }}>Upload</div>
                                </div>
                            )}
                        </Upload>
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