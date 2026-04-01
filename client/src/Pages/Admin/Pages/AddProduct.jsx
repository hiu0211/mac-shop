import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Form, Input, InputNumber, Upload, Button, Card, message, Space, Select, Divider, Empty } from 'antd';
import { UploadOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import {
    requestAddProduct,
    requestGetAllProductTypes,
    requestGetBrands,
    requestUploadImage,
} from '../../../Config/request';

const normalizeTemplate = (template) => {
    if (!Array.isArray(template)) {
        return [];
    }

    return template
        .filter((field) => field && typeof field === 'object' && field.key)
        .map((field) => ({
            key: String(field.key || '').trim(),
            label: String(field.label || field.key).trim(),
            inputType: String(field.inputType || 'text').trim().toLowerCase(),
            required: Boolean(field.required),
            placeholder: String(field.placeholder || '').trim(),
            options: Array.isArray(field.options) ? field.options.filter(Boolean) : [],
        }));
};

const isEmptyValue = (value) => value == null || String(value).trim() === '';

const AddProduct = ({ setActiveComponent }) => {
    const [form] = Form.useForm();
    const [uploading, setUploading] = useState(false);
    const [brands, setBrands] = useState([]);
    const [productTypes, setProductTypes] = useState([]);
    const [selectedTypeCode, setSelectedTypeCode] = useState('');
    const uploadCounterRef = React.useRef(0);

    const productTypeMap = useMemo(() => {
        return productTypes.reduce((accumulator, item) => {
            accumulator[item.code] = item;
            return accumulator;
        }, {});
    }, [productTypes]);

    const selectedTypeTemplate = useMemo(() => {
        const target = productTypeMap[selectedTypeCode];
        return normalizeTemplate(target?.attributesTemplate);
    }, [productTypeMap, selectedTypeCode]);

    const buildAttributesByType = useCallback(
        (typeCode, existingAttributes = {}) => {
            const template = normalizeTemplate(productTypeMap[typeCode]?.attributesTemplate);
            const nextAttributes = { ...existingAttributes };

            template.forEach((field) => {
                if (nextAttributes[field.key] == null) {
                    nextAttributes[field.key] = '';
                }
            });

            return nextAttributes;
        },
        [productTypeMap],
    );

    const handleComponentTypeChange = (nextTypeCode) => {
        setSelectedTypeCode(nextTypeCode);

        const currentAttributes = form.getFieldValue('attributes') || {};
        const mergedAttributes = buildAttributesByType(nextTypeCode, currentAttributes);

        form.setFieldsValue({
            componentType: nextTypeCode,
            attributes: mergedAttributes,
        });
    };

    useEffect(() => {
        const bootstrap = async () => {
            try {
                const [brandsResponse, productTypesResponse] = await Promise.all([
                    requestGetBrands({ active: true }),
                    requestGetAllProductTypes(),
                ]);

                const nextBrands = brandsResponse?.metadata || [];
                const nextTypes = productTypesResponse?.metadata || [];

                setBrands(nextBrands);
                setProductTypes(nextTypes);

                if (nextTypes.length === 0) {
                    message.warning('Vui lòng tạo loại sản phẩm trước khi thêm sản phẩm mới');
                    return;
                }

                const defaultTypeCode = nextTypes[0]?.code || '';
                const defaultAttributes = normalizeTemplate(nextTypes[0]?.attributesTemplate).reduce((accumulator, field) => {
                    accumulator[field.key] = '';
                    return accumulator;
                }, {});

                setSelectedTypeCode(defaultTypeCode);
                form.setFieldsValue({
                    componentType: defaultTypeCode,
                    attributes: defaultAttributes,
                    discount: 0,
                    costPrice: 0,
                });
            } catch (error) {
                console.error('Không thể tải dữ liệu khởi tạo:', error);
                message.error('Không thể tải dữ liệu loại sản phẩm hoặc hãng');
            }
        };

        bootstrap();
    }, [form]);

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
                brand: values.brand,
                price: values.price,
                discount: values.discount || 0,
                costPrice: values.costPrice || 0,
                stock: values.stock,
                images: imageUrls,
                componentType: values.componentType,
                attributes: values.attributes || {},
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

    const renderAttributeInput = (field) => {
        if (field.inputType === 'number') {
            return (
                <InputNumber
                    style={{ width: '100%' }}
                    placeholder={field.placeholder || `Nhập ${field.label.toLowerCase()}`}
                />
            );
        }

        if (field.inputType === 'select') {
            return (
                <Select
                    placeholder={field.placeholder || `Chọn ${field.label.toLowerCase()}`}
                    options={(field.options || []).map((option) => ({ value: option, label: option }))}
                />
            );
        }

        return <Input placeholder={field.placeholder || `Nhập ${field.label.toLowerCase()}`} />;
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
                    name="brand"
                    label="Hãng điện thoại"
                    rules={[{ required: true, message: 'Vui lòng chọn hãng điện thoại!' }]}
                >
                    <Select
                        placeholder="Chọn hãng điện thoại"
                        options={brands.map((brand) => ({ value: brand.name, label: brand.name }))}
                        showSearch
                        optionFilterProp="label"
                        notFoundContent="Chưa có hãng điện thoại"
                    />
                </Form.Item>

                <Form.Item
                    name="componentType"
                    label="Loại sản phẩm"
                    rules={[{ required: true, message: 'Vui lòng chọn loại sản phẩm!' }]}
                >
                    <Select
                        placeholder="Chọn loại sản phẩm"
                        options={productTypes.map((item) => ({
                            value: item.code,
                            label: `${item.name} (${item.code})`,
                        }))}
                        onChange={handleComponentTypeChange}
                        showSearch
                        optionFilterProp="label"
                        notFoundContent="Chưa có loại sản phẩm"
                    />
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
                        parser={(value) => (value || '').replace(/\$\s?|(,*)/g, '')}
                        placeholder="Nhập giá sản phẩm"
                        min={0}
                    />
                </Form.Item>

                <Form.Item
                    name="discount"
                    label="Giảm giá (%)"
                    rules={[
                        { type: 'number', min: 0, max: 100, message: 'Giảm giá chỉ từ 0 đến 100%' },
                    ]}
                >
                    <InputNumber
                        style={{ width: '100%' }}
                        placeholder="Nhập phần trăm giảm"
                        min={0}
                        max={100}
                    />
                </Form.Item>

                <Form.Item
                    name="costPrice"
                    label="Giá nhập"
                    rules={[{ type: 'number', min: 0, message: 'Giá nhập phải lớn hơn hoặc bằng 0!' }]}
                >
                    <InputNumber
                        style={{ width: '100%' }}
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value) => (value || '').replace(/\$\s?|(,*)/g, '')}
                        placeholder="Nhập giá nhập"
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

                <Divider>Thông số theo loại sản phẩm</Divider>

                {selectedTypeTemplate.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Loại sản phẩm chưa có cấu hình thuộc tính" />
                ) : (
                    selectedTypeTemplate.map((field) => (
                        <Form.Item
                            key={field.key}
                            name={['attributes', field.key]}
                            label={field.label}
                            rules={[
                                {
                                    validator: (_, value) => {
                                        if (!field.required || !isEmptyValue(value)) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error(`Vui lòng nhập ${field.label}`));
                                    },
                                },
                            ]}
                        >
                            {renderAttributeInput(field)}
                        </Form.Item>
                    ))
                )}

                <Form.Item>
                    <Space>
                        <Button type="primary" htmlType="submit" loading={uploading} disabled={productTypes.length === 0}>
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