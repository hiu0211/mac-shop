import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
    Button,
    Card,
    DatePicker,
    Form,
    Input,
    InputNumber,
    Modal,
    Popconfirm,
    Select,
    Space,
    Switch,
    Table,
    Tag,
    message,
} from 'antd';
import { EditOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import {
    requestGetFlashSales,
    requestCreateFlashSale,
    requestUpdateFlashSale,
    requestDeleteFlashSale,
    requestGetAllProduct,
} from '../../../Config/request';

const { RangePicker } = DatePicker;
const { Search } = Input;

const FlashSaleManagement = () => {
    const [flashSales, setFlashSales] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingFlashSale, setEditingFlashSale] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [form] = Form.useForm();

    const fetchData = async () => {
        try {
            setLoading(true);
            const [salesRes, productsRes] = await Promise.all([
                requestGetFlashSales(),
                requestGetAllProduct(),
            ]);
            setFlashSales(salesRes.metadata || []);
            setProducts(productsRes.metadata || []);
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu Flash Sale:', error);
            message.error('Không thể tải danh sách dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const dataSource = useMemo(() => {
        const normalizedSearch = searchText.trim().toLowerCase();
        return flashSales
            .filter((item) => {
                const productName = item.product?.name || '';
                return normalizedSearch
                    ? productName.toLowerCase().includes(normalizedSearch)
                    : true;
            })
            .map((item) => {
                const now = dayjs();
                const start = dayjs(item.startDate);
                const end = dayjs(item.endDate);
                
                let statusLabel = 'ACTIVE';
                if (!item.isActive) {
                    statusLabel = 'INACTIVE';
                } else if (now.isBefore(start)) {
                    statusLabel = 'UPCOMING';
                } else if (now.isAfter(end)) {
                    statusLabel = 'EXPIRED';
                } else if (item.soldQuantity >= item.quantity) {
                    statusLabel = 'SOLD_OUT';
                }

                return {
                    key: item._id,
                    id: item._id,
                    product: item.product,
                    flashSalePrice: item.flashSalePrice,
                    quantity: item.quantity,
                    soldQuantity: item.soldQuantity,
                    startDate: item.startDate,
                    endDate: item.endDate,
                    isActive: item.isActive,
                    statusLabel,
                };
            });
    }, [flashSales, searchText]);

    const handleOpenCreate = () => {
        setEditingFlashSale(null);
        form.resetFields();
        setModalOpen(true);
    };

    const handleOpenEdit = (record) => {
        setEditingFlashSale(record);
        form.setFieldsValue({
            productId: record.product?._id,
            flashSalePrice: record.flashSalePrice,
            quantity: record.quantity,
            dateRange: [
                record.startDate ? dayjs(record.startDate) : null,
                record.endDate ? dayjs(record.endDate) : null,
            ],
            isActive: record.isActive,
        });
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            await requestDeleteFlashSale(id);
            message.success('Xóa Flash Sale thành công');
            fetchData();
        } catch (error) {
            console.error('Lỗi khi xóa Flash Sale:', error);
            message.error('Xóa Flash Sale thất bại');
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const selectedProduct = products.find(p => p._id === values.productId);
            if (selectedProduct && values.flashSalePrice >= selectedProduct.price) {
                message.error('Giá khuyến mãi phải nhỏ hơn giá gốc của sản phẩm');
                return;
            }

            const payload = {
                productId: values.productId,
                flashSalePrice: values.flashSalePrice,
                quantity: values.quantity,
                startDate: values.dateRange?.[0]?.toDate(),
                endDate: values.dateRange?.[1]?.toDate(),
                isActive: values.isActive,
            };

            if (editingFlashSale) {
                await requestUpdateFlashSale({ id: editingFlashSale.id, ...payload });
                message.success('Cập nhật Flash Sale thành công');
            } else {
                await requestCreateFlashSale(payload);
                message.success('Tạo Flash Sale thành công');
            }

            setModalOpen(false);
            form.resetFields();
            fetchData();
        } catch (error) {
            if (error?.errorFields) return;
            console.error('Lỗi khi lưu Flash Sale:', error);
            message.error(
                error?.response?.data?.message || 'Lưu Flash Sale thất bại',
            );
        }
    };

    const handleModalCancel = () => {
        setModalOpen(false);
        form.resetFields();
    };

    const productOptions = useMemo(() => {
        return products.map(p => ({
            label: `${p.name} - ${p.price.toLocaleString('vi-VN')}đ`,
            value: p._id,
        }));
    }, [products]);

    const columns = [
        {
            title: 'Sản phẩm',
            dataIndex: 'product',
            key: 'product',
            render: (product) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {product?.images?.[0] && (
                        <img 
                            src={product.images[0]} 
                            alt={product.name} 
                            style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} 
                        />
                    )}
                    <div>
                        <div style={{ fontWeight: 'bold' }}>{product?.name || 'Sản phẩm đã bị xóa'}</div>
                        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Giá gốc: {product?.price?.toLocaleString('vi-VN')}đ</div>
                    </div>
                </div>
            )
        },
        {
            title: 'Giá Flash Sale',
            dataIndex: 'flashSalePrice',
            key: 'flashSalePrice',
            render: (value) => <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{value.toLocaleString('vi-VN')}đ</span>,
        },
        {
            title: 'Số lượng bán',
            dataIndex: 'quantity',
            key: 'quantity',
            align: 'center',
        },
        {
            title: 'Đã bán',
            dataIndex: 'soldQuantity',
            key: 'soldQuantity',
            align: 'center',
            render: (sold, record) => `${sold} / ${record.quantity}`,
        },
        {
            title: 'Thời gian áp dụng',
            key: 'dateRange',
            render: (_, record) => {
                const start = record.startDate
                    ? dayjs(record.startDate).format('DD/MM/YYYY HH:mm:ss')
                    : '-';
                const end = record.endDate
                    ? dayjs(record.endDate).format('DD/MM/YYYY HH:mm:ss')
                    : '-';
                return (
                    <div style={{ fontSize: '13px' }}>
                        <div>Bắt đầu: {start}</div>
                        <div>Kết thúc: {end}</div>
                    </div>
                );
            },
        },
        {
            title: 'Trạng thái',
            dataIndex: 'statusLabel',
            key: 'statusLabel',
            align: 'center',
            render: (status) => {
                let color = 'default';
                let text = '';
                switch (status) {
                    case 'ACTIVE':
                        color = 'green';
                        text = 'Đang diễn ra';
                        break;
                    case 'INACTIVE':
                        color = 'default';
                        text = 'Chưa kích hoạt';
                        break;
                    case 'UPCOMING':
                        color = 'blue';
                        text = 'Sắp diễn ra';
                        break;
                    case 'EXPIRED':
                        color = 'red';
                        text = 'Đã kết thúc';
                        break;
                    case 'SOLD_OUT':
                        color = 'orange';
                        text = 'Hết hàng';
                        break;
                    default:
                        break;
                }
                return <Tag color={color}>{text}</Tag>;
            },
        },
        {
            title: 'Thao tác',
            key: 'action',
            align: 'center',
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        icon={<EditOutlined />}
                        onClick={() => handleOpenEdit(record)}
                    />
                    <Popconfirm
                        title="Bạn có chắc muốn xóa Flash Sale này?"
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
            <Card
                title="Quản lý Flash Sale"
                extra={
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleOpenCreate}
                    >
                        Thêm mới
                    </Button>
                }
            >
                <Space>
                    <Search
                        placeholder="Tìm theo tên sản phẩm"
                        allowClear
                        onChange={(event) => setSearchText(event.target.value)}
                        value={searchText}
                        style={{ width: 350 }}
                    />
                </Space>
            </Card>

            <Table
                columns={columns}
                dataSource={dataSource}
                loading={loading}
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Tổng số ${total} Flash Sale`,
                }}
            />

            <Modal
                title={editingFlashSale ? 'Cập nhật Flash Sale' : 'Tạo Flash Sale mới'}
                open={modalOpen}
                onCancel={handleModalCancel}
                onOk={handleSubmit}
                okText="Lưu"
                cancelText="Hủy"
                width={600}
                styles={{ body: { paddingTop: '12px' } }}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        label="Sản phẩm"
                        name="productId"
                        rules={[
                            {
                                required: true,
                                message: 'Vui lòng chọn sản phẩm',
                            },
                        ]}
                    >
                        <Select
                            showSearch
                            placeholder="Chọn sản phẩm"
                            optionFilterProp="label"
                            options={productOptions}
                            disabled={!!editingFlashSale}
                        />
                    </Form.Item>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Form.Item
                            label="Giá khuyến mãi (VNĐ)"
                            name="flashSalePrice"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập giá khuyến mãi',
                                },
                            ]}
                        >
                            <InputNumber
                                min={0}
                                style={{ width: '100%' }}
                                placeholder="Nhập giá khuyến mãi"
                                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Số lượng bán"
                            name="quantity"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập số lượng bán',
                                },
                            ]}
                        >
                            <InputNumber
                                min={1}
                                style={{ width: '100%' }}
                                placeholder="Nhập số lượng"
                            />
                        </Form.Item>
                    </div>

                    <Form.Item
                        label="Thời gian áp dụng"
                        name="dateRange"
                        rules={[
                            {
                                required: true,
                                message: 'Vui lòng chọn thời gian áp dụng',
                            },
                        ]}
                    >
                        <RangePicker
                            showTime
                            style={{ width: '100%' }}
                            placeholder={['Bắt đầu', 'Kết thúc']}
                            format="YYYY-MM-DD HH:mm:ss"
                        />
                    </Form.Item>

                    <Form.Item
                        label="Trạng thái kích hoạt"
                        name="isActive"
                        valuePropName="checked"
                        initialValue={true}
                    >
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default FlashSaleManagement;
