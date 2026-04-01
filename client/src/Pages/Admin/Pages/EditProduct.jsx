import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Form, Input, InputNumber, Upload, Button, Card, message, Space, Select, Divider, Empty } from 'antd';
import { UploadOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import {
    requestEditProduct,
    requestGetAllProductTypes,
    requestGetBrands,
    requestGetProductById,
    requestUploadImage,
} from '../../../Config/request';

const LEGACY_SPEC_KEYS = ['cpu', 'screen', 'gpu', 'storage', 'screenHz', 'ram', 'battery', 'camera', 'weight'];

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

const parseAttributesObject = (attributes) => {
    if (!attributes) {
        return {};
    }

    if (typeof attributes === 'string') {
        try {
            const parsed = JSON.parse(attributes);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
            return {};
        }
    }

    if (typeof attributes === 'object' && !Array.isArray(attributes)) {
        return { ...attributes };
    }

    return {};
};

const extractLegacyAttributes = (product = {}) => {
    return LEGACY_SPEC_KEYS.reduce((accumulator, key) => {
        if (product[key] != null && String(product[key]).trim() !== '') {
            accumulator[key] = product[key];
        }
        return accumulator;
    }, {});
};

const isEmptyValue = (value) => value == null || String(value).trim() === '';

const EditProduct = ({ setActiveComponent, productId }) => {
    const [form] = Form.useForm();
    const [brands, setBrands] = useState([]);
    const [productTypes, setProductTypes] = useState([]);
    const [selectedTypeCode, setSelectedTypeCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
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
                setLoading(true);
                const [brandsResponse, productTypesResponse, productResponse] = await Promise.all([
                    requestGetBrands(),
                    requestGetAllProductTypes(),
                    requestGetProductById(productId),
                ]);

                const nextBrands = brandsResponse?.metadata || [];
                const nextTypes = productTypesResponse?.metadata || [];

                setBrands(nextBrands);
                setProductTypes(nextTypes);

                if (nextTypes.length === 0) {
                    message.error('Vui lòng tạo loại sản phẩm trước khi chỉnh sửa sản phẩm');
                    setActiveComponent('product-types');
                    return;
                }

                const product = productResponse?.metadata;
                if (!product) {
                    message.error('Không thể tải thông tin sản phẩm!');
                    setActiveComponent('products');
                    return;
                }

                const parsedAttributes = {
                    ...extractLegacyAttributes(product),
                    ...parseAttributesObject(product.attributes),
                };

                const typeCode = product.componentType || nextTypes[0]?.code || '';
                const template = normalizeTemplate(nextTypes.find((item) => item.code === typeCode)?.attributesTemplate);
                const mergedAttributes = { ...parsedAttributes };
                template.forEach((field) => {
                    if (mergedAttributes[field.key] == null) {
                        mergedAttributes[field.key] = '';
                    }
                });

                // Convert image URLs to Upload component format
                const imageFileList = (product?.images || []).map((url, index) => ({
                    uid: `-${index}`,
                    name: `image-${index}`,
                    status: 'done',
                    url: url,
                }));

                setSelectedTypeCode(typeCode);

                form.setFieldsValue({
                    ...product,
                    componentType: typeCode,
                    discount: Number(product?.discount || 0),
                    costPrice: Number(product?.costPrice || 0),
                    attributes: mergedAttributes,
                    image: imageFileList,
                });
            } catch (error) {
                console.error('Error fetching product:', error);
                message.error('Không thể tải thông tin sản phẩm!');
                setActiveComponent('products');
            } finally {
                setLoading(false);
            }
        };

        if (productId) {
            bootstrap();
        }
    }, [productId, form, setActiveComponent]);

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
            setSubmitting(true);
            let imageUrls = [];

            const oldImages = (values.image || []).filter((file) => file.url && !file.originFileObj);
            const newImages = (values.image || []).filter((file) => file.originFileObj);

            const oldImageUrls = oldImages.map((file) => file.url);

            let newImageUrls = [];
            if (newImages.length > 0) {
                newImageUrls = await handleUpload(newImages);
            }

            imageUrls = [...oldImageUrls, ...newImageUrls];

            const productData = {
                _id: productId,
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

            await requestEditProduct(productData);
            message.success('Cập nhật sản phẩm thành công');
            setActiveComponent('products');
        } catch (error) {
            message.error('Có lỗi xảy ra khi cập nhật sản phẩm!');
            console.error(error);
        } finally {
            setSubmitting(false);
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

    const beforeUpload = (file) => {
        // Kiểm tra định dạng file
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
            message.error('Chỉ được tải lên file ảnh!');
            return Upload.LIST_IGNORE;
        }

        // Kiểm tra kích thước file (tối đa 5MB)
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
                    <span>Chỉnh Sửa Sản Phẩm</span>
                </Space>
            }
        >
            <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off" disabled={loading}>
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
                    label="Giá gốc" 
                    rules={[{ required: true, message: 'Vui lòng nhập giá!' }]}
                >
                    <InputNumber
                        style={{ width: '100%' }}
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value) => (value || '').replace(/\$\s?|(,*)/g, '')}
                        placeholder="Nhập giá gốc"
                    />
                </Form.Item>

                <Form.Item
                    name="discount"
                    label="Giảm giá (%)"
                    rules={[{ type: 'number', min: 0, max: 100, message: 'Giảm giá chỉ từ 0 đến 100%' }]}
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
                        <Button type="primary" htmlType="submit" loading={submitting} disabled={productTypes.length === 0}>
                            Cập nhật sản phẩm
                        </Button>
                        <Button onClick={handleBack}>Hủy</Button>
                    </Space>
                </Form.Item>
            </Form>
        </Card>
    );
};

export default EditProduct;
