import { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames/bind';
import { Button, Card, Input, Popconfirm, Space, Table, Tag, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';

import styles from './ManagerProductType.module.scss';
import { requestDeleteProductType, requestGetAllProductTypes } from '../../../../Config/request';

const cx = classNames.bind(styles);

function ManagerProductType({ setActiveComponent, setProductTypeId }) {
    const [loading, setLoading] = useState(false);
    const [productTypes, setProductTypes] = useState([]);
    const [searchValue, setSearchValue] = useState('');

    const fetchProductTypes = async () => {
        try {
            setLoading(true);
            const response = await requestGetAllProductTypes();
            setProductTypes(response?.metadata || []);
        } catch (error) {
            message.error(error?.response?.data?.message || 'Không thể tải danh sách loại sản phẩm');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProductTypes();
    }, []);

    const dataSource = useMemo(() => {
        const keyword = searchValue.trim().toLowerCase();

        return productTypes
            .filter((item) => {
                if (!keyword) {
                    return true;
                }

                return (
                    String(item.code || '')
                        .toLowerCase()
                        .includes(keyword) ||
                    String(item.name || '')
                        .toLowerCase()
                        .includes(keyword)
                );
            })
            .map((item) => ({
                ...item,
                id: item._id,
                key: item._id,
            }));
    }, [productTypes, searchValue]);

    const handleCreate = () => {
        setProductTypeId(undefined);
        setActiveComponent('add-product-type');
    };

    const handleEdit = (record) => {
        setProductTypeId(record.id);
        setActiveComponent('edit-product-type');
    };

    const handleDelete = async (record) => {
        try {
            await requestDeleteProductType(record.id);
            message.success('Đã xóa loại sản phẩm');
            fetchProductTypes();
        } catch (error) {
            message.error(error?.response?.data?.message || 'Xóa loại sản phẩm thất bại');
        }
    };

    const columns = [
        {
            title: 'Mã',
            dataIndex: 'code',
            key: 'code',
            width: 180,
            render: (code) => <Tag color="blue">{code}</Tag>,
        },
        {
            title: 'Tên loại',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Số thuộc tính',
            key: 'attributesCount',
            width: 150,
            render: (_, record) => (Array.isArray(record.attributesTemplate) ? record.attributesTemplate.length : 0),
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 160,
            render: (_, record) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Popconfirm
                        title="Xóa loại sản phẩm"
                        description="Bạn có chắc muốn xóa loại sản phẩm này?"
                        okText="Xóa"
                        cancelText="Hủy"
                        onConfirm={() => handleDelete(record)}
                    >
                        <Button danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div className={cx('wrapper')}>
            <Card
                className={cx('toolbar')}
                title="Quản lý loại sản phẩm"
                extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                        Thêm loại sản phẩm
                    </Button>
                }
            >
                <Input.Search
                    placeholder="Tìm theo mã hoặc tên loại"
                    allowClear
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    onSearch={(value) => setSearchValue(value)}
                    style={{ maxWidth: 360 }}
                />
            </Card>

            <Table
                loading={loading}
                columns={columns}
                dataSource={dataSource}
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Tổng ${total} loại sản phẩm`,
                }}
            />
        </div>
    );
}

export default ManagerProductType;
