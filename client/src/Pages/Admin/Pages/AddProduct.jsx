import React, { useState } from 'react';
import { Form, Input, InputNumber, Upload, Button, Card, message, Space } from 'antd';
import { UploadOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import axios from 'axios';
import { requestAddProduct, requestUploadImage } from '../../../Config/request';

const AddProduct = ({ setActiveComponent }) => {
    const [form] = Form.useForm();
    const [imageFiles, setImageFiles] = useState([]);

    const handleUpload = async (files) => {
        try {
            const formData = new FormData();

            // Thêm tất cả files vào formData
            files.forEach((file) => {
                formData.append('images', file.originFileObj);
            });

            const res = await requestUploadImage(formData);
            return res.metadata;
        } catch (error) {
            console.error('Upload failed:', error);
            message.error('Upload ảnh thất bại!');
            throw error;
        }
    };

    const onFinish = async (values) => {
        try {
            // Upload ảnh trước
            const imageUrls = await handleUpload(values.image);

            // Tạo dữ liệu sản phẩm với URLs ảnh
            const productData = {
                ...values,
                images: imageUrls,
            };

            // Gửi dữ liệu sản phẩm
            await requestAddProduct(productData);

            message.success('Thêm sản phẩm thành công');
            form.resetFields();
            setImageFiles([]);
        } catch (error) {
            message.error('Có lỗi xảy ra khi thêm sản phẩm!');
            console.error(error);
        }
    };

    const handleBack = () => {
        setActiveComponent('products'); // Quay lại trang quản lý sản phẩm
    };

    const normFile = (e) => {
        if (Array.isArray(e)) {
            return e;
        }
        return e?.fileList;
    };

    return (
        <Card
            title={
                <Space>
                    <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
                        Quay lại
                    </Button>
                    <span>Thêm Sản Phẩm Mới</span>
                </Space>
            }
        >
            <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off">
                <Form.Item
                    name="name"
                    label="Tên sản phẩm"
                    rules={[{ required: true, message: 'Vui lòng nhập tên sản phẩm!' }]}
                >
                    <Input placeholder="Nhập tên sản phẩm" />
                </Form.Item>

                <Form.Item name="price" label="Giá gốc" rules={[{ required: true, message: 'Vui lòng nhập giá!' }]}>
                    <InputNumber
                        style={{ width: '100%' }}
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                        placeholder="Nhập giá gốc"
                    />
                </Form.Item>

                <Form.Item
                    name="priceDiscount"
                    label="Giá khuyến mãi"
                    rules={[{ required: true, message: 'Vui lòng nhập giá khuyến mãi!' }]}
                >
                    <InputNumber
                        style={{ width: '100%' }}
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                        placeholder="Nhập giá khuyến mãi"
                    />
                </Form.Item>

                <Form.Item
                    name="stock"
                    label="Số lượng trong kho"
                    rules={[{ required: true, message: 'Vui lòng nhập số lượng!' }]}
                >
                    <InputNumber style={{ width: '100%' }} placeholder="Nhập số lượng" />
                </Form.Item>

                <Form.Item
                    name="image"
                    label="Hình ảnh"
                    valuePropName="fileList"
                    getValueFromEvent={normFile}
                    rules={[{ required: true, message: 'Vui lòng tải lên hình ảnh!' }]}
                >
                    <Upload
                        name="images"
                        listType="picture-card"
                        multiple
                        maxCount={10}
                        beforeUpload={() => false} // Ngăn upload tự động
                    >
                        <div>
                            <UploadOutlined />
                            <div style={{ marginTop: 8 }}>Tải ảnh lên</div>
                        </div>
                    </Upload>
                </Form.Item>

                <Form.Item name="cpu" label="Chip xử lý (CPU)" rules={[{ required: true, message: 'Vui lòng nhập thông tin chip!' }]}>
                    <Input placeholder="Ví dụ: Chip A20" />
                </Form.Item>

                <Form.Item
                    name="screen"
                    label="Màn hình"
                    rules={[{ required: true, message: 'Vui lòng nhập thông tin màn hình!' }]}
                >
                    <Input placeholder="Ví dụ: OLED 6 inch" />
                </Form.Item>

                <Form.Item
                    name="gpu"
                    label="Chip đồ họa (GPU)"
                    rules={[{ required: true, message: 'Vui lòng nhập thông tin chip đồ họa!' }]}
                >
                    <Input placeholder="Ví dụ: Apple GPU 8 nhân" />
                </Form.Item>

                <Form.Item
                    name="storage"
                    label="Dung lượng lưu trữ"
                    rules={[{ required: true, message: 'Vui lòng nhập thông tin dung lượng!' }]}
                >
                    <Input placeholder="Ví dụ: 100 GB" />
                </Form.Item>

                <Form.Item
                    name="screenHz"
                    label="Tần số màn hình"
                    rules={[{ required: true, message: 'Vui lòng nhập tần số màn hình!' }]}
                >
                    <Input placeholder="Ví dụ: 100 Hz" />
                </Form.Item>

                <Form.Item name="ram" label="RAM" rules={[{ required: true, message: 'Vui lòng nhập thông tin RAM!' }]}>
                    <Input placeholder="Ví dụ: 10GB" />
                </Form.Item>

                <Form.Item
                    name="battery"
                    label="Pin"
                    rules={[{ required: true, message: 'Vui lòng nhập thông tin pin!' }]}
                >
                    <Input placeholder="Ví dụ: 3.000mAh" />
                </Form.Item>

                <Form.Item
                    name="camera"
                    label="Camera"
                    rules={[{ required: true, message: 'Vui lòng nhập thông tin camera!' }]}
                >
                    <Input placeholder="Ví dụ: 4K, 1080p, và 720p" />
                </Form.Item>

                <Form.Item
                    name="weight"
                    label="Trọng lượng"
                    rules={[{ required: true, message: 'Vui lòng nhập trọng lượng!' }]}
                >
                    <Input placeholder="Ví dụ: 200 gram" />
                </Form.Item>

                <Form.Item>
                    <Space>
                        <Button type="primary" htmlType="submit">
                            Thêm sản phẩm
                        </Button>
                        <Button onClick={handleBack}>Hủy</Button>
                    </Space>
                </Form.Item>
            </Form>
        </Card>
    );
};

export default AddProduct;
