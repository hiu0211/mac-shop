import React, { useEffect, useState } from 'react';
import { Table, Space, Button, Input, Card, Tag, Image, Popconfirm, Select, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { requestDeleteProduct, requestGetAllProduct } from '../../../Config/request';

const DEFAULT_FILTER_VALUE = 'all';

const sortProducts = (products = []) =>
    [...products].sort((a, b) => {
        if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt) - new Date(a.createdAt);
        }
        return String(b._id || '').localeCompare(String(a._id || ''));
    });

const buildFilterOptions = (products = []) => {
    const brands = [...new Set(products.map((item) => String(item.brand || '').trim()).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'vi', { sensitivity: 'base' })
    );

    const componentTypeMap = new Map();
    products.forEach((item) => {
        const componentTypeValue = String(item.componentType || '').trim();
        if (!componentTypeValue || componentTypeMap.has(componentTypeValue)) {
            return;
        }

        const componentTypeLabel = String(item.componentTypeName || componentTypeValue).trim() || componentTypeValue;
        componentTypeMap.set(componentTypeValue, componentTypeLabel);
    });

    const componentTypes = [...componentTypeMap.entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label, 'vi', { sensitivity: 'base' }));

    return {
        brands,
        componentTypes,
    };
};

const ProductManagement = ({ setActiveComponent, setProductId }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [brandFilter, setBrandFilter] = useState(DEFAULT_FILTER_VALUE);
    const [componentTypeFilter, setComponentTypeFilter] = useState(DEFAULT_FILTER_VALUE);
    const [filterOptions, setFilterOptions] = useState({ brands: [], componentTypes: [] });

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
            dataIndex: 'componentTypeLabel',
            key: 'componentType',
            render: (componentTypeLabel) => <Tag color="purple">{componentTypeLabel || 'Chưa cập nhật'}</Tag>,
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

    const fetchData = async ({ brand = DEFAULT_FILTER_VALUE, componentType = DEFAULT_FILTER_VALUE } = {}) => {
        try {
            setLoading(true);
            const params = {};
            if (brand && brand !== DEFAULT_FILTER_VALUE) {
                params.brand = brand;
            }
            if (componentType && componentType !== DEFAULT_FILTER_VALUE) {
                params.componentType = componentType;
            }

            const res = await requestGetAllProduct(params);
            setProducts(sortProducts(res.metadata || []));
        } catch (error) {
            console.error('Lỗi khi lấy danh sách sản phẩm:', error);
            message.error('Không thể tải danh sách sản phẩm');
        } finally {
            setLoading(false);
        }
    };

    const fetchFilterOptions = async () => {
        try {
            const res = await requestGetAllProduct();
            const allProducts = sortProducts(res.metadata || []);
            setFilterOptions(buildFilterOptions(allProducts));
        } catch (error) {
            console.error('Lỗi khi lấy bộ lọc sản phẩm:', error);
        }
    };

    useEffect(() => {
        fetchFilterOptions();
    }, []);

    useEffect(() => {
        fetchData({ brand: brandFilter, componentType: componentTypeFilter });
    }, [brandFilter, componentTypeFilter]);

    const data = products.map((product) => ({
        key: product._id,
        id: product._id,
        name: product.name,
        brand: product.brand,
        componentType: product.componentType,
        componentTypeLabel: product.componentTypeName || product.componentType,
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
            item.componentTypeLabel?.toLowerCase().includes(searchLower) ||
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
            await Promise.all([
                fetchData({ brand: brandFilter, componentType: componentTypeFilter }),
                fetchFilterOptions(),
            ]);
            message.success('Xóa sản phẩm thành công');
        } catch (error) {
            console.error('Lỗi khi xóa sản phẩm:', error);
            message.error('Xóa sản phẩm thất bại');
        }
    };

    const brandSelectOptions = [
        { label: 'Tất cả hãng', value: DEFAULT_FILTER_VALUE },
        ...filterOptions.brands.map((brand) => ({
            label: brand,
            value: brand,
        })),
    ];

    const componentTypeSelectOptions = [
        { label: 'Tất cả loại sản phẩm', value: DEFAULT_FILTER_VALUE },
        ...filterOptions.componentTypes.map((componentType) => componentType),
    ];

    return (
        <div>
            <Card
                title="Quản lý sản phẩm"
                extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                        Thêm sản phẩm
                    </Button>
                }
            >
                <Space wrap size={12}>
                    <Input.Search
                        placeholder="Tìm kiếm theo tên, hãng hoặc giá sản phẩm"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onSearch={(value) => setSearchText(value)}
                        allowClear
                        style={{ width: 350 }}
                    />

                    <Select
                        value={brandFilter}
                        allowClear
                        style={{ width: 220 }}
                        options={brandSelectOptions}
                        onChange={(value) => setBrandFilter(value || DEFAULT_FILTER_VALUE)}
                    />

                    <Select
                        value={componentTypeFilter}
                        allowClear
                        style={{ width: 220 }}
                        options={componentTypeSelectOptions}
                        onChange={(value) => setComponentTypeFilter(value || DEFAULT_FILTER_VALUE)}
                    />
                </Space>
            </Card>

            <Table
                columns={columns}
                dataSource={filteredData}
                loading={loading}
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