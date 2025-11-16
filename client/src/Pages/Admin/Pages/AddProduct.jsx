import React, { useState } from 'react';
import { Form, Input, InputNumber, Upload, Button, Card, message, Space } from 'antd';
import { UploadOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { requestAddProduct, requestUploadImage } from '../../../Config/request';

const AddProduct = ({ setActiveComponent }) => {
    const [form] = Form.useForm();
    const [uploading, setUploading] = useState(false);
    const uploadCounterRef = React.useRef(0);

    const handleUpload = async (files) => {
        try {
            const formData = new FormData();

            // Chỉ upload những file mới (có originFileObj và chưa có url)
            files.forEach((file) => {
                if (file.originFileObj && !file.url) {
                    formData.append('images', file.originFileObj);
                }
            });

            // Kiểm tra xem có file nào cần upload không
            if (!formData.has('images')) {
                console.log('Không có file mới cần upload');
                return [];
            }

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
            setUploading(true);

            // Upload ảnh trước
            const imageUrls = await handleUpload(values.image || []);

            // Kiểm tra xem có ảnh nào được upload không
            if (!imageUrls || imageUrls.length === 0) {
                message.error('Vui lòng tải lên ít nhất một hình ảnh!');
                setUploading(false);
                return;
            }

            // Tạo dữ liệu sản phẩm với URLs ảnh
            const productData = {
                name: values.name,
                price: values.price,
                priceDiscount: values.priceDiscount,
                stock: values.stock,
                images: imageUrls,
                cpu: values.cpu,
                screen: values.screen,
                gpu: values.gpu,
                storage: values.storage,
                screenHz: values.screenHz,
                ram: values.ram,
                battery: values.battery,
                camera: values.camera,
                weight: values.weight,
            };

            // Gửi dữ liệu sản phẩm
            await requestAddProduct(productData);

            message.success('Thêm sản phẩm thành công');
            form.resetFields();
            
            // Có thể quay lại trang danh sách sản phẩm sau khi thêm thành công
            setTimeout(() => {
                setActiveComponent('products');
            }, 100);
        } catch (error) {
            console.error(error);
            message.error('Có lỗi xảy ra khi thêm sản phẩm!');
        } finally {
            setUploading(false);
        }
    };

    const handleBack = () => {
        setActiveComponent('products');
    };

    const normFile = (e) => {
        if (Array.isArray(e)) {
            return e;
        }
        return e?.fileList;
    };

    const beforeUpload = (file) => {
        // Kiểm tra định dạng file
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
            message.error('Chỉ được tải lên file ảnh!');
            return Upload.LIST_IGNORE;
        }

        // Kiểm tra kích thước file (ví dụ: tối đa 5MB)
        const isLt5M = file.size / 1024 / 1024 < 5;
        if (!isLt5M) {
            message.error('Ảnh phải nhỏ hơn 5MB!');
            return Upload.LIST_IGNORE;
        }

        // Tạo uid hoàn toàn duy nhất với performance.now() (độ chính xác microsecond)
        uploadCounterRef.current += 1;
        const timestamp = performance.now().toString().replace('.', '');
        file.uid = `upload-${timestamp}-${uploadCounterRef.current}-${file.size}-${file.name.replace(/[^a-zA-Z0-9]/g, '')}`;
        
        return false; // Ngăn upload tự động
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

                <Form.Item 
                    name="price"
                    label="Giá sản phẩm" 
                    rules={[
                        { required: true, message: 'Vui lòng nhập giá!' },
                        { type: 'number', min: 0, message: 'Giá phải lớn hơn 0!' }
                    ]}
                >
                    <InputNumber
                        style={{ width: '100%' }}
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                        placeholder="Nhập giá sản phẩm"
                        min={0}
                    />
                </Form.Item>

                <Form.Item
                    name="priceDiscount"
                    label="Giá khuyến mãi"
                    rules={[
                        { required: true, message: 'Vui lòng nhập giá khuyến mãi!' },
                        { type: 'number', min: 0, message: 'Giá phải lớn hơn 0!' },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                const price = getFieldValue('price');
                                if (!value || !price || value <= price) {
                                    return Promise.resolve();
                                }
                                return Promise.reject(new Error('Giá khuyến mãi phải nhỏ hơn hoặc bằng giá gốc!'));
                            },
                        }),
                    ]}
                >
                    <InputNumber
                        style={{ width: '100%' }}
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                        placeholder="Nhập giá khuyến mãi"
                        min={0}
                    />
                </Form.Item>

                <Form.Item
                    name="stock"
                    label="Số lượng trong kho"
                    rules={[
                        { required: true, message: 'Vui lòng nhập số lượng!' },
                        { type: 'number', min: 0, message: 'Số lượng phải lớn hơn hoặc bằng 0!' }
                    ]}
                >
                    <InputNumber 
                        style={{ width: '100%' }} 
                        placeholder="Nhập số lượng"
                        min={0}
                    />
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
                        beforeUpload={beforeUpload}
                        accept="image/*"
                    >
                        <div>
                            <UploadOutlined />
                            <div style={{ marginTop: 8 }}>Tải ảnh lên</div>
                        </div>
                    </Upload>
                </Form.Item>

                <Form.Item 
                    name="cpu" 
                    label="Chip xử lý (CPU)" 
                    rules={[{ required: true, message: 'Vui lòng nhập thông tin chip!' }]}
                >
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

                <Form.Item 
                    name="ram" 
                    label="RAM" 
                    rules={[{ required: true, message: 'Vui lòng nhập thông tin RAM!' }]}
                >
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
                        <Button type="primary" htmlType="submit" loading={uploading}>
                            {uploading ? 'Đang xử lý...' : 'Thêm sản phẩm'}
                        </Button>
                        <Button onClick={handleBack} disabled={uploading}>
                            Hủy
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </Card>
    );
};

export default AddProduct;