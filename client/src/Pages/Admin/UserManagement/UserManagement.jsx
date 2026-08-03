import React, { useEffect, useMemo, useState } from 'react';
import { Button, Descriptions, Drawer, Form, Input, Modal, Select, Space, Table, Tag, Tooltip, message } from 'antd';
import { EyeOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { requestCreateUser, requestGetAllUser, requestUpdateUserRole, requestUpdateUserStatus } from '../../../Config/request';
import { useStore } from '../../../hooks/useStore';

const roleOptions = [
    { label: 'Admin', value: true },
    { label: 'Người dùng', value: false },
];

const accountStatusOptions = [
    { label: 'Đang hoạt động', value: true },
    { label: 'Ngừng hoạt động', value: false },
];

const phoneRule = (_, value) => {
    if (!value) {
        return Promise.reject(new Error('Vui lòng nhập số điện thoại'));
    }

    let normalizedPhone = String(value).trim().replace(/[\s().-]/g, '');

    if (normalizedPhone.startsWith('+84')) {
        normalizedPhone = `0${normalizedPhone.slice(3)}`;
    }

    const vietnamPhonePattern = /^(0(?:3|5|7|8|9)\d{8})$/;

    if (!vietnamPhonePattern.test(normalizedPhone)) {
        return Promise.reject(new Error('Số điện thoại không hợp lệ'));
    }

    return Promise.resolve();
};

const formatDateTime = (value) => (value ? dayjs(value).format('DD/MM/YYYY HH:mm') : 'N/A');

const renderVipTag = (vipTier) => {
    switch (vipTier) {
        case 'dong':
            return <Tag color="#cd7f32">VIP Đồng (2%)</Tag>;
        case 'bac':
            return <Tag color="#718096">VIP Bạc (5%)</Tag>;
        case 'vang':
            return <Tag color="#d69e2e">VIP Vàng (10%)</Tag>;
        case 'kimcuong':
            return <Tag color="#00b5d8">VIP Kim Cương (15%)</Tag>;
        default:
            return <Tag color="default">Thành viên</Tag>;
    }
};

const UserManagement = () => {
    const { dataUser } = useStore();
    const [dataUsers, setDataUsers] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [loading, setLoading] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState(true);
    const [selectedRole, setSelectedRole] = useState(false);
    const [savingChanges, setSavingChanges] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [createForm] = Form.useForm();

    const isCurrentUserSelected = useMemo(() => {
        const selectedUserId = String(selectedUser?._id || '');
        const currentUserId = String(dataUser?._id || '');

        if (!selectedUserId || !currentUserId) {
            return false;
        }

        return selectedUserId === currentUserId;
    }, [selectedUser, dataUser]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await requestGetAllUser();
            setDataUsers(res?.metadata?.users || []);
        } catch (error) {
            message.error(error?.response?.data?.message || 'Lỗi khi lấy danh sách người dùng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const tableData = useMemo(
        () =>
            dataUsers.map((user) => ({
                key: user._id,
                id: user._id,
                name: user.fullName,
                email: user.email,
                phone: user.phone,
                isAdmin: user.isAdmin,
                isActive: user.isActive,
                typeLogin: user.typeLogin,
                vipTier: user.vipTier || 'none',
                yearlySpending: user.yearlySpending || 0,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                rawUser: user,
            })),
        [dataUsers],
    );

    const filteredData = useMemo(() => {
        const searchLower = searchText.toLowerCase();

        return tableData.filter((item) => {
            return (
                item.name?.toLowerCase().includes(searchLower) ||
                item.email?.toLowerCase().includes(searchLower) ||
                item.phone?.toLowerCase().includes(searchLower)
            );
        });
    }, [tableData, searchText]);

    const handleOpenDetail = (user) => {
        setSelectedUser(user);
        setSelectedStatus(Boolean(user?.isActive));
        setSelectedRole(Boolean(user?.isAdmin));
        setDrawerOpen(true);
    };

    const handleCloseDetail = () => {
        setDrawerOpen(false);
        setSelectedUser(null);
        setSelectedStatus(true);
        setSelectedRole(false);
    };

    const syncUpdatedUser = (updatedUser) => {
        if (!updatedUser?._id) {
            return;
        }

        setDataUsers((prev) => prev.map((item) => (item._id === updatedUser._id ? updatedUser : item)));
        setSelectedUser(updatedUser);
        setSelectedStatus(Boolean(updatedUser.isActive));
        setSelectedRole(Boolean(updatedUser.isAdmin));
    };

    const handleOpenCreateModal = () => {
        setCreateModalOpen(true);
        createForm.setFieldsValue({
            isAdmin: false,
        });
    };

    const handleCloseCreateModal = () => {
        setCreateModalOpen(false);
        createForm.resetFields();
    };

    const handleCreateUser = async (values) => {
        setCreateLoading(true);

        try {
            const res = await requestCreateUser({
                fullName: values.fullName?.trim(),
                email: values.email?.trim(),
                phone: values.phone?.trim(),
                isAdmin: values.isAdmin,
            });

            const newUser = res?.metadata?.user;

            if (newUser?._id) {
                setDataUsers((prev) => [newUser, ...prev]);
            }

            message.success('Đã tạo người dùng mới và gửi email thông báo');
            handleCloseCreateModal();
        } catch (error) {
            message.error(error?.response?.data?.message || 'Không thể tạo người dùng mới');
        } finally {
            setCreateLoading(false);
        }
    };

    const handleSaveChanges = async () => {
        if (!selectedUser) {
            return;
        }

        if (isCurrentUserSelected) {
            message.warning('Bạn không thể tự thay đổi quyền hoặc khóa tài khoản của chính mình');
            return;
        }

        const hasStatusChanged = Boolean(selectedUser.isActive) !== selectedStatus;
        const hasRoleChanged = Boolean(selectedUser.isAdmin) !== selectedRole;

        if (!hasStatusChanged && !hasRoleChanged) {
            message.info('Không có thay đổi để lưu');
            return;
        }

        setSavingChanges(true);
        try {
            let latestUser = selectedUser;

            if (hasRoleChanged) {
                const roleRes = await requestUpdateUserRole({
                    id: selectedUser._id,
                    isAdmin: selectedRole,
                });
                latestUser = roleRes?.metadata?.user || latestUser;
            }

            if (hasStatusChanged) {
                const statusRes = await requestUpdateUserStatus({
                    id: selectedUser._id,
                    isActive: selectedStatus,
                });
                latestUser = statusRes?.metadata?.user || latestUser;
            }

            syncUpdatedUser(latestUser);

            if (hasRoleChanged && hasStatusChanged) {
                message.success('Đã cập nhật quyền và trạng thái tài khoản thành công');
            } else if (hasRoleChanged) {
                message.success('Đã cập nhật quyền người dùng thành công');
            } else {
                message.success('Đã cập nhật trạng thái tài khoản thành công');
            }
        } catch (error) {
            message.error(error?.response?.data?.message || 'Không thể cập nhật thông tin. Vui lòng thử lại');
        } finally {
            setSavingChanges(false);
        }
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            hidden: true,
        },
        {
            title: 'Tên người dùng',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Số điện thoại',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: 'Vai trò',
            dataIndex: 'isAdmin',
            key: 'isAdmin',
            render: (isAdmin) =>
                isAdmin ? <Tag color="red">Admin</Tag> : <Tag color="blue">Người dùng</Tag>,
            filters: [
                { text: 'Admin', value: true },
                { text: 'Người dùng', value: false },
            ],
            onFilter: (value, record) => record.isAdmin === value,
        },
        {
            title: 'Trạng thái tài khoản',
            dataIndex: 'isActive',
            key: 'isActive',
            render: (isActive) =>
                isActive ? <Tag color="green">Đang hoạt động</Tag> : <Tag color="red">Ngừng hoạt động</Tag>,
            filters: [
                { text: 'Đang hoạt động', value: true },
                { text: 'Ngừng hoạt động', value: false },
            ],
            onFilter: (value, record) => record.isActive === value,
        },
        {
            title: 'Hạng VIP',
            dataIndex: 'vipTier',
            key: 'vipTier',
            render: (vipTier) => renderVipTag(vipTier),
            filters: [
                { text: 'Thành viên', value: 'none' },
                { text: 'VIP Đồng (2%)', value: 'dong' },
                { text: 'VIP Bạc (5%)', value: 'bac' },
                { text: 'VIP Vàng (10%)', value: 'vang' },
                { text: 'VIP Kim Cương (15%)', value: 'kimcuong' },
            ],
            onFilter: (value, record) => record.vipTier === value,
        },
        {
            title: 'Loại tài khoản',
            dataIndex: 'typeLogin',
            key: 'typeLogin',
            render: (typeLogin) =>
                typeLogin === 'google' ? <Tag color="orange">Google</Tag> : <Tag color="green">Email</Tag>,
            filters: [
                { text: 'Google', value: 'google' },
                { text: 'Email', value: 'email' },
            ],
            onFilter: (value, record) => record.typeLogin === value,
        },
        {
            title: 'Thao tác',
            key: 'actions',
            align: 'center',
            render: (_, record) => (
                <Button type="default" icon={<EyeOutlined />} onClick={() => handleOpenDetail(record.rawUser)}>
                </Button>
            ),
        },
    ];

    return (
        <div>
            <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <h2 style={{ marginBottom: 0 }}>Quản lý người dùng</h2>
            </Space>

            <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <Input
                    placeholder="Tìm kiếm người dùng"
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                    style={{ width: 350 }}
                />
                <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
                    Thêm mới người dùng
                </Button>
            </Space>
            <Table
                rowKey="id"
                columns={columns}
                dataSource={filteredData}
                loading={loading}
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Tổng số ${total} người dùng`,
                }}
            />

            <Drawer
                title="Chi tiết người dùng"
                width={560}
                open={drawerOpen}
                onClose={handleCloseDetail}
                destroyOnClose
            >
                {selectedUser ? (
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <Descriptions bordered column={1} size="small">
                            <Descriptions.Item label="Họ và tên">{selectedUser.fullName || 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Email">{selectedUser.email || 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Số điện thoại">{selectedUser.phone || 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Hạng VIP">
                                {renderVipTag(selectedUser.vipTier || 'none')}
                            </Descriptions.Item>
                            <Descriptions.Item label="Tổng chi tiêu năm hiện tại">
                                {Number(selectedUser.yearlySpending || 0).toLocaleString('vi-VN')} đ
                            </Descriptions.Item>
                            <Descriptions.Item label="Loại tài khoản">
                                {selectedUser.typeLogin === 'google' ? (
                                    <Tag color="orange">Google</Tag>
                                ) : (
                                    <Tag color="green">Email</Tag>
                                )}
                            </Descriptions.Item>
                            <Descriptions.Item label="Trạng thái tài khoản">
                                {selectedUser.isActive ? <Tag color="green">Đang hoạt động</Tag> : <Tag color="red">Ngừng hoạt động</Tag>}
                            </Descriptions.Item>
                            <Descriptions.Item label="Vai trò">
                                {selectedUser.isAdmin ? <Tag color="red">Admin</Tag> : <Tag color="blue">Người dùng</Tag>}
                            </Descriptions.Item>
                            <Descriptions.Item label="Ngày tạo">{formatDateTime(selectedUser.createdAt)}</Descriptions.Item>
                            <Descriptions.Item label="Ngày cập nhật">{formatDateTime(selectedUser.updatedAt)}</Descriptions.Item>
                        </Descriptions>

                        <div>
                            <div style={{ marginBottom: 8, fontWeight: 600 }}>Trạng thái tài khoản</div>
                            <Tooltip
                                title={
                                    isCurrentUserSelected
                                        ? 'Bạn không được thay đổi trạng thái tài khoản của chính mình'
                                        : null
                                }
                            >
                                <span style={{ display: 'block' }}>
                                    <Select
                                        value={selectedStatus}
                                        options={accountStatusOptions}
                                        onChange={setSelectedStatus}
                                        style={{ width: '100%' }}
                                        disabled={isCurrentUserSelected}
                                    />
                                </span>
                            </Tooltip>
                        </div>

                        <div>
                            <div style={{ marginBottom: 8, fontWeight: 600 }}>Quyền</div>
                            <Tooltip
                                title={
                                    isCurrentUserSelected
                                        ? 'Bạn không được thay đổi quyền của chính mình'
                                        : null
                                }
                            >
                                <span style={{ display: 'block' }}>
                                    <Select
                                        value={selectedRole}
                                        options={roleOptions}
                                        onChange={setSelectedRole}
                                        style={{ width: '100%' }}
                                        disabled={isCurrentUserSelected}
                                    />
                                </span>
                            </Tooltip>
                        </div>

                        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                            <Button onClick={handleCloseDetail}>Đóng</Button>
                            <Button
                                type="primary"
                                onClick={handleSaveChanges}
                                loading={savingChanges}
                                disabled={
                                    isCurrentUserSelected ||
                                    Boolean(selectedUser.isActive) === selectedStatus &&
                                    Boolean(selectedUser.isAdmin) === selectedRole
                                }
                            >
                                Lưu
                            </Button>
                        </Space>
                    </Space>
                ) : null}
            </Drawer>

            <Modal
                title="Thêm mới người dùng"
                open={createModalOpen}
                onCancel={handleCloseCreateModal}
                onOk={() => createForm.submit()}
                okText="Tạo mới"
                cancelText="Hủy"
                confirmLoading={createLoading}
                destroyOnHidden
            >
                <Form
                    form={createForm}
                    layout="vertical"
                    onFinish={handleCreateUser}
                    initialValues={{ isAdmin: false }}
                >
                    <Form.Item
                        label="Họ và tên"
                        name="fullName"
                        rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
                    >
                        <Input placeholder="Nhập họ và tên" />
                    </Form.Item>

                    <Form.Item
                        label="Email"
                        name="email"
                        rules={[
                            { required: true, message: 'Vui lòng nhập email' },
                            { type: 'email', message: 'Email không hợp lệ' },
                        ]}
                    >
                        <Input placeholder="Nhập email" />
                    </Form.Item>

                    <Form.Item
                        label="Số điện thoại"
                        name="phone"
                        rules={[{ validator: phoneRule }]}
                    >
                        <Input placeholder="Nhập số điện thoại" />
                    </Form.Item>

                    <Form.Item
                        label="Vai trò"
                        name="isAdmin"
                        rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
                    >
                        <Select options={roleOptions} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default UserManagement;