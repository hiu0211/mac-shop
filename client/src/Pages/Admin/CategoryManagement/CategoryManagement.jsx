import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, Modal, Popconfirm, Space, Switch, Table, Tag, message, Pagination, Upload } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import useDebounce from '../../../hooks/useDebounce';
import {
    requestCreateCategory,
    requestDeleteCategory,
    requestGetAdminCategories,
    requestUpdateCategory,
} from '../../../Config/request';

const { Search, TextArea } = Input;

const getBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });

const CategoryManagement = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchText, setSearchText] = useState('');
    const debouncedSearch = useDebounce(searchText, 300);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);

    const [form] = Form.useForm();
    const [uploadFileList, setUploadFileList] = useState([]);

    const fetchCategories = async (opts = {}) => {
        try {
            setLoading(true);
            const params = {
                page: opts.page || page,
                limit: opts.limit || limit,
                search: opts.search !== undefined ? opts.search : debouncedSearch,
            };

            const res = await requestGetAdminCategories(params);
            const metadata = res?.metadata || {};
            setCategories(metadata.data || []);
            setTotal(metadata.total || 0);
            setPage(metadata.page || 1);
            setLimit(metadata.limit || 10);
        } catch (error) {
            console.error('Lỗi khi tải danh sách danh mục:', error);
            message.error(error?.response?.data?.message || 'Không thể tải danh mục');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories({ page: 1, limit });
    }, [debouncedSearch]);

    const handleOpenCreate = () => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({ isActive: true });
        setUploadFileList([]);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (record) => {
        setEditing(record);
        form.setFieldsValue({
            name: record.name,
            description: record.description,
            image: record.image || '',
            isActive: record.isActive,
        });
        setUploadFileList(record.image ? [{ uid: '-1', name: 'image', status: 'done', url: record.image }] : []);
        setIsModalOpen(true);
    };

    const handleBeforeUpload = async (file) => {
        const isImage = file.type && file.type.startsWith('image/');
        if (!isImage) {
            message.error('Chỉ được tải lên file ảnh!');
            return Upload.LIST_IGNORE;
        }

        const isLt5M = file.size / 1024 / 1024 < 5;
        if (!isLt5M) {
            message.error('Ảnh phải nhỏ hơn 5MB!');
            return Upload.LIST_IGNORE;
        }

        try {
            const base64 = await getBase64(file);
            const nextFile = { uid: `${Date.now()}`, name: file.name, status: 'done', url: base64 };
            setUploadFileList([nextFile]);
            form.setFieldsValue({ image: base64 });
        } catch (err) {
            console.error('File read error', err);
            message.error('Không thể đọc file ảnh');
        }

        return Upload.LIST_IGNORE; // prevent auto upload
    };

    const handleRemove = () => {
        setUploadFileList([]);
        form.setFieldsValue({ image: '' });
    };

    const handleDelete = async (id) => {
        try {
            await requestDeleteCategory(id);
            message.success('Xóa danh mục thành công');
            fetchCategories();
        } catch (error) {
            console.error('Lỗi khi xóa danh mục:', error);
            message.error(error?.response?.data?.message || 'Xóa danh mục thất bại');
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);

            const payload = {
                name: values.name,
                description: values.description || '',
                image: values.image || '',
                isActive: !!values.isActive,
            };

            if (editing) {
                await requestUpdateCategory(editing._id, payload);
                message.success('Cập nhật danh mục thành công');
            } else {
                await requestCreateCategory(payload);
                message.success('Thêm danh mục thành công');
            }

            setIsModalOpen(false);
            form.resetFields();
            fetchCategories({ page: 1, limit });
        } catch (error) {
            if (error?.errorFields) {
                return;
            }
            console.error('Lỗi khi lưu danh mục:', error);
            message.error(error?.response?.data?.message || 'Lưu danh mục thất bại');
        } finally {
            setSaving(false);
        }
    };

    const columns = [
        // {
        //     title: 'Mã danh mục',
        //     dataIndex: 'slug',
        //     key: 'slug',
        // },
        {
            title: 'Tên',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'isActive',
            key: 'isActive',
            render: (isActive) => <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Hoạt động' : 'Không hoạt động'}</Tag>,
        },
        {
            title: 'Số sản phẩm',
            dataIndex: 'productCount',
            key: 'productCount',
            align: 'center',
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
                        title="Bạn có chắc muốn xóa danh mục này?"
                        onConfirm={() => handleDelete(record._id)}
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
            <Card
                title="Quản lý danh mục"
                extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
                        Thêm danh mục
                    </Button>
                }
            >
                <Space style={{ marginBottom: 12 }}>
                    <Search
                        placeholder="Tìm theo tên danh mục"
                        allowClear
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ width: 350 }}
                    />
                </Space>

                <Table
                    columns={columns}
                    dataSource={categories}
                    rowKey={(record) => record._id}
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => `Tổng số ${total} danh mục`,
                    }}
                />

                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                    <Pagination
                        current={page}
                        pageSize={limit}
                        total={total}
                        showSizeChanger
                        onChange={(p, pageSize) => {
                            setPage(p);
                            setLimit(pageSize);
                            fetchCategories({ page: p, limit: pageSize });
                        }}
                    />
                </div>
            </Card>

            <Modal
                title={editing ? 'Cập nhật danh mục' : 'Thêm danh mục'}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={handleSubmit}
                okText="Lưu"
                cancelText="Hủy"
                confirmLoading={saving}
            >
                <Form form={form} layout="vertical" initialValues={{ isActive: true }}>
                    <Form.Item label="Tên" name="name" rules={[{ required: true, message: 'Vui lòng nhập tên danh mục' }]}>
                        <Input placeholder="Ví dụ: Điện thoại" />
                    </Form.Item>

                    <Form.Item label="Mô tả" name="description">
                        <TextArea rows={3} placeholder="Mô tả" />
                    </Form.Item>

                    <Form.Item label="Ảnh" name="image">
                        <Upload
                            listType="picture-card"
                            accept="image/*"
                            beforeUpload={handleBeforeUpload}
                            fileList={uploadFileList}
                            onRemove={handleRemove}
                            maxCount={1}
                        >
                            {uploadFileList.length >= 1 ? null : (
                                <div>
                                    <PlusOutlined />
                                    <div style={{ marginTop: 8 }}>Tải ảnh</div>
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

export default CategoryManagement;
