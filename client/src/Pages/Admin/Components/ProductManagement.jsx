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
            title: 'Hãng',
            dataIndex: 'brand',
            key: 'brand',
            render: (brand) => <Tag color="blue">{brand || 'Chưa cập nhật'}</Tag>,
            sorter: (a, b) => (a.brand || '').localeCompare(b.brand || ''),
        },
        {
            title: 'Loại sản phẩm',
            dataIndex: 'componentType',
            key: 'componentType',
            render: (componentType) => <Tag color="purple">{componentType || 'Chưa cập nhật'}</Tag>,
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
            dataIndex: 'displayPrice',
            key: 'displayPrice',
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
                    <Button icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                    </Button>
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xóa sản phẩm này?"
                        onConfirm={() => handleDelete(record.key)}
                        okText="Có"
                        cancelText="Không"
                    >
                        <Button danger icon={<DeleteOutlined />}>
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const fetchData = async () => {
        try {
            const res = await requestGetAllProduct();
            // Sort sản phẩm theo createdAt (nếu có) hoặc _id descending
            const sortedProducts = (res.metadata || []).sort((a, b) => {
                // Ưu tiên sort theo createdAt nếu có
                if (a.createdAt && b.createdAt) {
                    return new Date(b.createdAt) - new Date(a.createdAt);
                }
                // Fallback: sort theo _id (MongoDB ObjectId)
                return b._id.localeCompare(a._id);
            });
            setProducts(sortedProducts);
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
        brand: product.brand,
        componentType: product.componentType,
        price: product.price,
        priceDiscount: product.priceDiscount,
        displayPrice: product.priceDiscount > 0 ? product.priceDiscount : product.price,
        stock: product.stock,
        image: product.images[0],
    }));

    // Lọc sản phẩm theo searchText
    const filteredData = data.filter((item) => {
        const searchLower = searchText.toLowerCase();
        return (
            item.name?.toLowerCase().includes(searchLower) ||
            item.brand?.toLowerCase().includes(searchLower) ||
            item.componentType?.toLowerCase().includes(searchLower) ||
            item.price?.toString().includes(searchLower) ||
            item.displayPrice?.toString().includes(searchLower)
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
                <Space>
                    <Input.Search
                        placeholder="Tìm kiếm theo tên, hãng hoặc giá sản phẩm"
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