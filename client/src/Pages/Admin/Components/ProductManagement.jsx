import React, { useEffect, useState } from 'react';
import { Table, Space, Button, Input, Card, Tag, Image, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { requestDeleteProduct, requestGetAllProduct } from '../../../Config/request';

const ProductManagement = ({ setActiveComponent, setProductId }) => {
    const [products, setProducts] = useState([]);
    const [searchText, setSearchText] = useState('');

    const columns = [
        {
            title: 'Hình ảnh',
            dataIndex: 'image',
            key: 'image',
            render: (image) => (
                <Image
                    src={image}
                    alt="product"
                    width={80}
                    height={80}
                    fallback="https://via.placeholder.com/80"
                />
            ),
        },
        {
            title: 'Tên sản phẩm',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
        {
            title: 'Giá gốc',
            dataIndex: 'price',
            key: 'price',
            hidden: true,
            render: (price) => `${price.toLocaleString()} VNĐ`,
            sorter: (a, b) => a.price - b.price,
        },
        {
            title: 'Giá sản phẩm',
            dataIndex: 'priceDiscount',
            key: 'priceDiscount',
            render: (price) => `${price.toLocaleString()} VNĐ`,
        },
        {
            title: 'Tồn kho',
            dataIndex: 'stock',
            key: 'stock',
            render: (stock) => (
                <Tag color={stock > 0 ? 'green' : 'red'}>{stock > 0 ? `${stock} sản phẩm` : 'Hết hàng'}</Tag>
            ),
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Button type="primary" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                        Sửa
                    </Button>
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xóa sản phẩm này?"
                        onConfirm={() => handleDelete(record.key)}
                        okText="Có"
                        cancelText="Không"
                    >
                        <Button type="primary" danger icon={<DeleteOutlined />}>
                            Xóa
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const fetchData = async () => {
        try {
            const res = await requestGetAllProduct();
            setProducts(res.metadata);
        } catch (error) {
            console.error('Lỗi khi lấy danh sách sản phẩm:', error);
            message.error('Không thể tải danh sách sản phẩm');
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const data = products.map((product) => ({
        key: product._id,
        id: product._id,
        name: product.name,
        price: product.price,
        priceDiscount: product.priceDiscount,
        stock: product.stock,
        image: product.images[0],
    }));

    // Lọc sản phẩm theo searchText
    const filteredData = data.filter((item) => {
        const searchLower = searchText.toLowerCase();
        return (
            item.name?.toLowerCase().includes(searchLower) ||
            item.price?.toString().includes(searchLower) ||
            item.priceDiscount?.toString().includes(searchLower)
        );
    });

    const handleAdd = () => {
        setActiveComponent('add-product');
    };

    const handleEdit = (record) => {
        setProductId(record.id);
        setActiveComponent('edit-product');
    };

    const handleDelete = async (key) => {
        try {
            await requestDeleteProduct(key);
            await fetchData();
            message.success('Xóa sản phẩm thành công');
        } catch (error) {
            console.error('Lỗi khi xóa sản phẩm:', error);
            message.error('Xóa sản phẩm thất bại');
        }
    };

    return (
        <div>
            <Card title="Quản lý sản phẩm">
                <Space style={{ marginBottom: 16 }}>
                    <Input.Search
                        placeholder="Tìm kiếm theo tên hoặc giá sản phẩm"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onSearch={(value) => setSearchText(value)}
                        allowClear
                        style={{ width: 350 }}
                    />
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                        Thêm sản phẩm
                    </Button>
                </Space>
            </Card>

            <Table
                columns={columns}
                dataSource={filteredData}
                pagination={{
                    total: filteredData.length,
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `Tổng ${total} sản phẩm`,
                }}
            />
        </div>
    );
};

export default ProductManagement;