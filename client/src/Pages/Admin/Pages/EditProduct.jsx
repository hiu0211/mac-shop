import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Form, Input, InputNumber, Upload, Button, Card, message, Space, Select, Divider, Empty, Row, Col, Checkbox } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import {
    requestEditProduct,
    requestGetAllProductTypes,
    requestGetBrands,
    requestGetProductById,
    requestUploadImage,
} from '../../../Config/request';
import {
    buildColorOptionsAfterRemove,
    buildColorOptionsAfterToggleDefault,
    enforceSingleDefaultColorOption,
    getDefaultColorPrice,
    hasDefaultColorOption,
    syncProductPriceWithDefaultColor,
} from './colorPriceSync';

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

const normalizeColorKey = (value = '') =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const normalizeColorOptions = (colorOptions = []) => {
    if (!Array.isArray(colorOptions)) {
        return [];
    }

    const seenNames = new Set();

    const normalized = colorOptions
        .filter((item) => item && typeof item === 'object')
        .map((item, index) => {
            const name = String(item.name || '').trim();
            const nameKey = name.toLowerCase();
            const price = Number(item.price);

            if (!name || !Number.isFinite(price) || price < 0 || seenNames.has(nameKey)) {
                return null;
            }

            seenNames.add(nameKey);

            const image = typeof item.image === 'string' ? item.image.trim() : '';

            const option = {
                key: normalizeColorKey(item.key || name || `color-${index + 1}`) || `color-${index + 1}`,
                name,
                image,
                price,
                isDefault: Boolean(item.isDefault),
            };

            return option;
        })
        .filter(Boolean);

    if (normalized.length === 0) {
        return [];
    }

    const defaultIndex = normalized.findIndex((item) => item.isDefault);

    if (defaultIndex !== -1) {
        normalized.forEach((item, index) => {
            item.isDefault = index === defaultIndex;
        });
    }

    return normalized;
};

const mapColorOptionsToFormValues = (colorOptions = []) => {
    return normalizeColorOptions(colorOptions).map((item, index) => ({
        ...item,
        image: item.image
            ? [
                {
                    uid: `color-image-${item.key || index}`,
                    name: item.name || `color-${index + 1}`,
                    status: 'done',
                    url: item.image,
                },
            ]
            : [],
    }));
};

const resolveColorImageUrlFromValue = (imageValue) => {
    if (typeof imageValue === 'string') {
        return imageValue.trim();
    }

    if (Array.isArray(imageValue)) {
        const existingFile = imageValue.find((file) => file?.url && !file?.originFileObj);
        return String(existingFile?.url || '').trim();
    }

    return '';
};

const uploadColorOptionImages = async (colorOptions = []) => {
    if (!Array.isArray(colorOptions) || colorOptions.length === 0) {
        return [];
    }

    const filesToUpload = [];

    colorOptions.forEach((option) => {
        const imageFileList = Array.isArray(option?.image) ? option.image : [];
        const newImageFile = imageFileList.find((file) => file?.originFileObj);

        if (newImageFile?.originFileObj) {
            filesToUpload.push(newImageFile.originFileObj);
        }
    });

    let uploadedUrls = [];

    if (filesToUpload.length > 0) {
        const formData = new FormData();
        filesToUpload.forEach((file) => {
            formData.append('images', file);
        });

        const uploadResponse = await requestUploadImage(formData);
        uploadedUrls = Array.isArray(uploadResponse?.metadata) ? uploadResponse.metadata : [];

        if (uploadedUrls.length !== filesToUpload.length) {
            throw new Error('Không thể tải đầy đủ ảnh màu, vui lòng thử lại');
        }
    }

    let uploadCursor = 0;

    return colorOptions.map((option) => {
        const imageFileList = Array.isArray(option?.image) ? option.image : [];
        const hasNewImage = imageFileList.some((file) => file?.originFileObj);
        const existingImageUrl = resolveColorImageUrlFromValue(option?.image);

        const image = hasNewImage
            ? String(uploadedUrls[uploadCursor++] || '').trim()
            : existingImageUrl;

        return {
            ...option,
            image,
        };
    });
};

const EditProduct = ({ setActiveComponent, productId }) => {
    const [form] = Form.useForm();
    const [brands, setBrands] = useState([]);
    const [productTypes, setProductTypes] = useState([]);
    const [selectedTypeCode, setSelectedTypeCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const uploadCounterRef = React.useRef(0);
    const watchedColorOptions = Form.useWatch('colorOptions', form);

    const isPriceLockedByDefaultColor = useMemo(() => {
        const currentColorOptions = Array.isArray(watchedColorOptions) ? watchedColorOptions : [];
        return hasDefaultColorOption(currentColorOptions);
    }, [watchedColorOptions]);

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
                    colorOptions: mapColorOptionsToFormValues(product?.colorOptions || []),
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

    useEffect(() => {
        const currentColorOptions = Array.isArray(watchedColorOptions) ? watchedColorOptions : [];
        const normalizedColorOptions = enforceSingleDefaultColorOption(currentColorOptions);

        const hasDefaultFlagChanged = normalizedColorOptions.some(
            (item, index) => Boolean(item?.isDefault) !== Boolean(currentColorOptions[index]?.isDefault),
        );

        if (hasDefaultFlagChanged) {
            form.setFieldsValue({ colorOptions: normalizedColorOptions });
            return;
        }

        syncProductPriceWithDefaultColor(form, currentColorOptions);
    }, [watchedColorOptions, form]);

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

            const rawColorOptions = Array.isArray(values.colorOptions)
                ? values.colorOptions.filter((item) => item && typeof item === 'object')
                : [];
            const colorOptionsWithUploadedImages = await uploadColorOptionImages(rawColorOptions);
            const normalizedColorOptions = normalizeColorOptions(colorOptionsWithUploadedImages);
            const defaultColorPrice = getDefaultColorPrice(normalizedColorOptions);

            if (normalizedColorOptions.length !== rawColorOptions.length) {
                message.error('Danh sách màu có dữ liệu không hợp lệ hoặc bị trùng tên');
                setSubmitting(false);
                return;
            }

            const productData = {
                _id: productId,
                name: values.name,
                brand: values.brand,
                price: defaultColorPrice ?? values.price,
                discount: values.discount || 0,
                costPrice: values.costPrice || 0,
                stock: values.stock,
                images: imageUrls,
                componentType: values.componentType,
                attributes: values.attributes || {},
                colorOptions: normalizedColorOptions,
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

    const handleSelectDefaultColor = (targetIndex, checked) => {
        const currentColorOptions = Array.isArray(form.getFieldValue('colorOptions'))
            ? form.getFieldValue('colorOptions')
            : [];

        const nextColorOptions = buildColorOptionsAfterToggleDefault(currentColorOptions, targetIndex, checked);

        form.setFieldsValue({ colorOptions: nextColorOptions });
        syncProductPriceWithDefaultColor(form, nextColorOptions);
    };

    const handleRemoveColorOption = (targetIndex) => {
        const currentColorOptions = Array.isArray(form.getFieldValue('colorOptions'))
            ? form.getFieldValue('colorOptions')
            : [];

        const nextColorOptions = buildColorOptionsAfterRemove(currentColorOptions, targetIndex);
        form.setFieldsValue({ colorOptions: nextColorOptions });
        syncProductPriceWithDefaultColor(form, nextColorOptions);
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
                    <span>Chỉnh Sửa Sản Phẩm</span>
                </Space>
            }
            extra={
                <Space>
                    <Button onClick={handleBack} disabled={submitting}>
                        Quay lại
                    </Button>
                    <Button type="primary" onClick={() => form.submit()} loading={submitting} disabled={productTypes.length === 0}>
                        Cập nhật sản phẩm
                    </Button>
                </Space>
            }
        >
            <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off" disabled={loading}>
                <Row gutter={[16, 0]}>
                    <Col xs={24} md={24}>
                        <Form.Item
                            name="name"
                            label="Tên sản phẩm"
                            rules={[{ required: true, message: 'Vui lòng nhập tên sản phẩm!' }]}
                        >
                            <Input placeholder="Nhập tên sản phẩm" />
                        </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
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
                    </Col>

                    <Col xs={24} md={12}>
                        <Form.Item
                            name="componentType"
                            label="Loại sản phẩm"
                            rules={[{ required: true, message: 'Vui lòng chọn loại sản phẩm!' }]}
                        >
                            <Select
                                placeholder="Chọn loại sản phẩm"
                                options={productTypes.map((item) => ({
                                    value: item.code,
                                    label: item.name,
                                }))}
                                onChange={handleComponentTypeChange}
                                showSearch
                                optionFilterProp="label"
                                notFoundContent="Chưa có loại sản phẩm"
                            />
                        </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
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
                                disabled={isPriceLockedByDefaultColor}
                            />
                        </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
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
                                formatter={(value) => `${value}%`}
                                parser={(value) => (value || '').replace('%', '')}
                            />
                        </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
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
                    </Col>

                    <Col xs={24} md={12}>
                        <Form.Item
                            name="stock"
                            label="Số lượng trong kho"
                            rules={[{ required: true, message: 'Vui lòng nhập số lượng!' }]}
                        >
                            <InputNumber style={{ width: '100%' }} placeholder="Nhập số lượng" />
                        </Form.Item>
                    </Col>

                    <Col span={24}>
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
                    </Col>

                    <Col span={24}>
                        <Divider orientation='start' style={{ textTransform: 'uppercase' }}>Tùy chọn màu sắc</Divider>
                        <Form.List name="colorOptions">
                            {(fields, { add }) => (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {fields.map((field) => (
                                        <Row key={field.key} gutter={[12, 0]} align="middle">
                                            <Col xs={24} md={7}>
                                                <Form.Item
                                                    {...field}
                                                    name={[field.name, 'image']}
                                                    label="Hình ảnh"
                                                    valuePropName="fileList"
                                                    getValueFromEvent={normFile}
                                                >
                                                    <Upload
                                                        name="color-image"
                                                        listType="picture"
                                                        maxCount={1}
                                                        beforeUpload={beforeUpload}
                                                        accept="image/*"
                                                    >
                                                        <Button icon={<UploadOutlined />}>Tải ảnh</Button>
                                                    </Upload>
                                                </Form.Item>
                                            </Col>

                                            <Col xs={24} md={7}>
                                                <Form.Item
                                                    {...field}
                                                    name={[field.name, 'name']}
                                                    label="Tên màu"
                                                    rules={[{ required: true, message: 'Nhập tên màu' }]}
                                                >
                                                    <Input placeholder="Ví dụ: Titan Tự Nhiên" />
                                                </Form.Item>
                                            </Col>

                                            <Col xs={24} md={5}>
                                                <Form.Item
                                                    {...field}
                                                    name={[field.name, 'price']}
                                                    label="Giá"
                                                    rules={[
                                                        { required: true, message: 'Nhập giá' },
                                                        { type: 'number', min: 0, message: 'Giá phải >= 0' },
                                                    ]}
                                                >
                                                    <InputNumber
                                                        style={{ width: '100%' }}
                                                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                                        parser={(value) => (value || '').replace(/\$\s?|(,*)/g, '')}
                                                        placeholder="Giá"
                                                        min={0}
                                                    />
                                                </Form.Item>
                                            </Col>

                                            <Col xs={24} md={2}>
                                                <Form.Item
                                                    {...field}
                                                    name={[field.name, 'isDefault']}
                                                    label="Mặc định"
                                                    valuePropName="checked"
                                                >
                                                    <Checkbox onChange={(event) => handleSelectDefaultColor(field.name, event.target.checked)} />
                                                </Form.Item>
                                            </Col>

                                            <Col xs={24} md={3}>
                                                <Form.Item label=" ">
                                                    <Button danger onClick={() => handleRemoveColorOption(field.name)} block>
                                                        Xóa
                                                    </Button>
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                    ))}

                                    <Button type="dashed" onClick={() => add({ name: '', image: [], price: 0, isDefault: false })}>
                                        + Thêm màu
                                    </Button>
                                </div>
                            )}
                        </Form.List>
                    </Col>

                    <Col span={24}>
                        <Divider orientation='start' style={{ textTransform: 'uppercase' }}>Thông số kỹ thuật</Divider>
                    </Col>

                    <Col span={24}>
                        {selectedTypeTemplate.length === 0 ? (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Loại sản phẩm chưa có cấu hình thuộc tính" />
                        ) : (
                            <Row gutter={[16, 0]}>
                                {selectedTypeTemplate.map((field) => (
                                    <Col key={field.key} xs={24} md={12}>
                                        <Form.Item
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
                                    </Col>
                                ))}
                            </Row>
                        )}
                    </Col>

                    <Col span={24}>
                        <Form.Item>
                            <Space>
                                <Button type="primary" htmlType="submit" loading={submitting} disabled={productTypes.length === 0}>
                                    Cập nhật sản phẩm
                                </Button>
                                <Button onClick={handleBack} disabled={submitting}>
                                    Quay lại
                                </Button>
                            </Space>
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Card>
    );
};

export default EditProduct;
