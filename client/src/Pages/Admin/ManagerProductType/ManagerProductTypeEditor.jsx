import { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames/bind';
import {
    ArrowLeftOutlined,
    DeleteOutlined,
    PicLeftOutlined,
    PlusOutlined,
} from '@ant-design/icons';
import { Button, Form, Input, Select, Space, Switch, Tooltip, message } from 'antd';

import styles from './ManagerProductTypeEditor.module.scss';
import {
    requestCheckProductTypeCodeExists,
    requestCreateProductType,
    requestGetAllProductTypes,
    requestUpdateProductType,
} from '../../../Config/request';

const cx = classNames.bind(styles);

const getDefaultAttributeField = () => ({
    key: '',
    label: '',
    inputType: 'text',
    required: false,
    placeholder: '',
    optionsText: [],
});

const removeVietnamese = (str) => {
    return String(str || '')
        .trim()
        .toLowerCase()
        .replace(/[đĐ]/g, 'd')
        .normalize('NFD')
        .replace(/[\u0300-\u036f\u1ab0-\u1dff\ufe20-\ufe2f]/g, '');
};

const generateKeyFromLabel = (label) => {
    return removeVietnamese(label)
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
};

const generateCodeFromName = (name) => {
    return removeVietnamese(name)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

import { useNavigate, useParams } from 'react-router-dom';

function ManagerProductTypeEditor() {
    const navigate = useNavigate();
    const { productTypeId } = useParams();
    const [form] = Form.useForm();

    const isEditMode = Boolean(productTypeId);

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [allTypes, setAllTypes] = useState([]);

    const editingType = useMemo(() => {
        if (!isEditMode) {
            return null;
        }
        return allTypes.find((item) => item._id === productTypeId) || null;
    }, [allTypes, isEditMode, productTypeId]);

    useEffect(() => {
        let isMounted = true;

        const bootstrap = async () => {
            try {
                setLoading(true);
                const response = await requestGetAllProductTypes();
                const nextTypes = response?.metadata || [];

                if (!isMounted) {
                    return;
                }

                setAllTypes(nextTypes);

                if (!isEditMode) {
                    form.setFieldsValue({
                        code: '',
                        name: '',
                        attributesTemplate: [getDefaultAttributeField()],
                    });
                    return;
                }

                const record = nextTypes.find((item) => item._id === productTypeId);
                if (!record) {
                    message.error('Không tìm thấy loại sản phẩm cần chỉnh sửa');
                    navigate('/admin/product-types');
                    return;
                }

                const attributesTemplate = Array.isArray(record.attributesTemplate) ? record.attributesTemplate : [];

                form.setFieldsValue({
                    id: record._id,
                    code: record.code,
                    name: record.name,
                    attributesTemplate:
                        attributesTemplate.length > 0
                            ? attributesTemplate.map((field) => ({
                                  key: field.key || '',
                                  label: field.label || '',
                                  inputType: field.inputType || 'text',
                                  required: Boolean(field.required),
                                  placeholder: field.placeholder || '',
                                  optionsText: Array.isArray(field.options) ? field.options : [],
                              }))
                            : [getDefaultAttributeField()],
                });
            } catch (error) {
                message.error(error?.response?.data?.message || 'Không thể tải dữ liệu loại sản phẩm');
                if (isEditMode) {
                    navigate('/admin/product-types');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        bootstrap();

        return () => {
            isMounted = false;
        };
    }, [form, isEditMode, productTypeId, navigate]);

    const handleGenerateCodeByName = () => {
        const name = String(form.getFieldValue('name') || '').trim();

        if (!name) {
            message.warning('Vui lòng nhập tên loại sản phẩm trước');
            return;
        }

        const generatedCode = generateCodeFromName(name);
        if (!generatedCode) {
            message.warning('Không thể tạo mã từ tên hiện tại');
            return;
        }

        form.setFieldValue('code', generatedCode);
    };

    const validateCodeUnique = async (_, value) => {
        if (!value) {
            return Promise.resolve();
        }

        const normalizedCode = String(value || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-');

        if (isEditMode && editingType?.code === normalizedCode) {
            return Promise.resolve();
        }

        try {
            const exists = await requestCheckProductTypeCodeExists(normalizedCode);
            if (exists) {
                return Promise.reject(new Error('Mã loại này đã tồn tại trong hệ thống'));
            }
            return Promise.resolve();
        } catch {
            return Promise.resolve();
        }
    };

    const handleSubmit = async () => {
        try {
            setSubmitting(true);
            const values = await form.validateFields();

            const attributesTemplate = (values.attributesTemplate || [])
                .filter((item) => item?.key && item?.label)
                .map((item) => {
                    const options =
                        item.inputType === 'select'
                            ? (item.optionsText || []).map((opt) => String(opt).trim()).filter(Boolean)
                            : [];

                    return {
                        key: String(item.key || '')
                            .trim()
                            .toLowerCase()
                            .replace(/\s+/g, '_'),
                        label: String(item.label || '').trim(),
                        inputType: item.inputType,
                        required: Boolean(item.required),
                        placeholder: String(item.placeholder || '').trim(),
                        options,
                    };
                });

            const payload = {
                code: String(values.code || '')
                    .trim()
                    .toLowerCase()
                    .replace(/\s+/g, '-'),
                name: String(values.name || '').trim(),
                attributesTemplate,
            };

            if (isEditMode) {
                await requestUpdateProductType(productTypeId, payload);
                message.success('Đã cập nhật loại sản phẩm');
            } else {
                await requestCreateProductType(payload);
                message.success('Đã tạo loại sản phẩm');
            }

            navigate('/admin/product-types');
        } catch (error) {
            if (error?.errorFields) {
                return;
            }
            const errorMessage = error?.response?.data?.message || 'Lưu loại sản phẩm thất bại';
            message.error(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={cx('wrapper')}>
            <div className={cx('header')}>
                <Space>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/product-types')}>
                        Quay lại
                    </Button>
                    <h2>{isEditMode ? 'Cập nhật loại sản phẩm' : 'Thêm loại sản phẩm'}</h2>
                </Space>

                <Button type="primary" onClick={handleSubmit} loading={submitting} disabled={loading}>
                    {isEditMode ? 'Lưu thay đổi' : 'Tạo loại sản phẩm'}
                </Button>
            </div>

            <Form
                form={form}
                layout="vertical"
                className={cx('form')}
                disabled={loading}
            >
                <div className={cx('row')}>
                    <Form.Item
                        name="name"
                        label="Tên loại sản phẩm"
                        rules={[{ required: true, message: 'Vui lòng nhập tên loại sản phẩm' }]}
                    >
                        <Input placeholder="Ví dụ: Smartphone" />
                    </Form.Item>

                    <Form.Item
                        name="code"
                        label="Mã loại"
                        rules={[
                            { required: true, message: 'Vui lòng nhập mã loại' },
                            {
                                pattern: /^[a-zA-Z0-9-_]+$/,
                                message: 'Chỉ chấp nhận ký tự chữ, số, gạch ngang và gạch dưới',
                            },
                            {
                                validator: validateCodeUnique,
                            },
                        ]}
                    >
                        <Input
                            placeholder="Ví dụ: smartphone"
                            suffix={
                                <Tooltip title="Sinh mã từ tên loại">
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<PicLeftOutlined />}
                                        onClick={handleGenerateCodeByName}
                                        style={{ padding: '0 4px' }}
                                    />
                                </Tooltip>
                            }
                        />
                    </Form.Item>
                </div>

                <Form.List name="attributesTemplate">
                    {(fields, { add, remove }) => (
                        <div className={cx('template-section')}>
                            <div className={cx('template-header')}>
                                <h3>Cấu hình thuộc tính</h3>
                            </div>

                            {fields.map(({ key, name, ...restField }) => (
                                <div key={key} className={cx('template-item')}>
                                    <div className={cx('attribute-top')}>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'required']}
                                            label="Bắt buộc"
                                            valuePropName="checked"
                                            className={cx('switch-item')}
                                            hidden
                                            initialValue={true}
                                        >
                                            <Switch />
                                        </Form.Item>
                                    </div>

                                    <div className={cx('attribute-bottom')}>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'label']}
                                            label="Tên thuộc tính"
                                            className={cx('field-item')}
                                            rules={[{ required: true, message: 'Vui lòng nhập tên thuộc tính' }]}
                                        >
                                            <Input
                                                placeholder="Ví dụ: Socket, RAM, Capacity 16GB"
                                            />
                                        </Form.Item>

                                        <Form.Item
                                            {...restField}
                                            name={[name, 'key']}
                                            label="Mã thuộc tính"
                                            className={cx('field-item')}
                                            rules={[
                                                { required: true, message: 'Vui lòng nhập mã thuộc tính' },
                                                {
                                                    pattern: /^[a-zA-Z0-9-_]+$/,
                                                    message: 'Mã chỉ gồm chữ, số, gạch ngang/gạch dưới',
                                                },
                                            ]}
                                        >
                                            <Input
                                                placeholder="Ví dụ: socket"
                                                suffix={
                                                    <Tooltip title="Tự động tạo mã từ tên thuộc tính">
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            icon={<PicLeftOutlined />}
                                                            onClick={() => {
                                                                const label = form.getFieldValue([
                                                                    'attributesTemplate',
                                                                    name,
                                                                    'label',
                                                                ]);

                                                                if (!label || !label.trim()) {
                                                                    message.warning('Vui lòng nhập tên thuộc tính trước');
                                                                    return;
                                                                }

                                                                const generated = generateKeyFromLabel(label);
                                                                form.setFieldValue(['attributesTemplate', name, 'key'], generated);
                                                            }}
                                                            style={{ padding: '0 4px' }}
                                                        />
                                                    </Tooltip>
                                                }
                                            />
                                        </Form.Item>

                                        <Form.Item shouldUpdate noStyle>
                                            {() => {
                                                const inputType = form.getFieldValue(['attributesTemplate', name, 'inputType']);

                                                return (
                                                    <Form.Item label="Kiểu dữ liệu" className={cx('field-item')}>
                                                        <Space.Compact block>
                                                            <Form.Item
                                                                {...restField}
                                                                name={[name, 'inputType']}
                                                                noStyle
                                                                rules={[
                                                                    {
                                                                        required: true,
                                                                        message: 'Vui lòng chọn kiểu dữ liệu',
                                                                    },
                                                                ]}
                                                            >
                                                                <Select
                                                                    style={{ width: inputType === 'select' ? '30%' : '100%' }}
                                                                    options={[
                                                                        { value: 'text', label: 'Text' },
                                                                        { value: 'number', label: 'Number' },
                                                                        { value: 'select', label: 'Select' },
                                                                    ]}
                                                                />
                                                            </Form.Item>

                                                            {inputType === 'select' ? (
                                                                <Form.Item
                                                                    {...restField}
                                                                    name={[name, 'optionsText']}
                                                                    noStyle
                                                                    rules={[
                                                                        {
                                                                            required: true,
                                                                            message: 'Vui lòng nhập các tùy chọn cho trường select',
                                                                        },
                                                                    ]}
                                                                >
                                                                    <Select
                                                                        mode="tags"
                                                                        placeholder="Ví dụ: DDR4, DDR5"
                                                                        tokenSeparators={[',']}
                                                                        style={{ width: '70%' }}
                                                                        maxTagCount="responsive"
                                                                    />
                                                                </Form.Item>
                                                            ) : null}
                                                        </Space.Compact>
                                                    </Form.Item>
                                                );
                                            }}
                                        </Form.Item>

                                        <Button
                                            danger
                                            type="text"
                                            icon={<DeleteOutlined />}
                                            className={cx('delete-btn')}
                                            onClick={() => remove(name)}
                                        />
                                    </div>

                                    <Form.Item
                                        hidden
                                        {...restField}
                                        name={[name, 'placeholder']}
                                        initialValue="Nhập..."
                                    >
                                        <Input />
                                    </Form.Item>
                                </div>
                            ))}

                            <div className={cx('template-footer')}>
                                <Button
                                    type="dashed"
                                    icon={<PlusOutlined />}
                                    style={{ width: '100%' }}
                                    onClick={() => add(getDefaultAttributeField())}
                                >
                                    {fields.length === 0 ? 'Tạo thuộc tính đầu tiên' : 'Thêm thuộc tính'}
                                </Button>
                            </div>
                        </div>
                    )}
                </Form.List>
            </Form>
        </div>
    );
}

export default ManagerProductTypeEditor;