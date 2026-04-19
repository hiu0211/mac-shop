import React, { useEffect, useMemo, useState } from 'react';
import { Button, Descriptions, Drawer, Input, Select, Space, Table, Tag, message } from 'antd';
import { EyeOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { requestGetAllUser, requestUpdateUserRole } from '../../../Config/request';

const roleOptions = [
    { label: 'Admin', value: true },
    { label: 'Người dùng', value: false },
];

const formatDateTime = (value) => (value ? dayjs(value).format('DD/MM/YYYY HH:mm') : 'N/A');

const UserManagement = () => {
    const [dataUsers, setDataUsers] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [loading, setLoading] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedRole, setSelectedRole] = useState(false);
    const [updatingRole, setUpdatingRole] = useState(false);

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
        setSelectedRole(Boolean(user?.isAdmin));
        setDrawerOpen(true);
    };

    const handleCloseDetail = () => {
        setDrawerOpen(false);
        setSelectedUser(null);
        setSelectedRole(false);
    };

    const handleUpdateRole = async () => {
        if (!selectedUser) {
            return;
        }

        if (Boolean(selectedUser.isAdmin) === selectedRole) {
            message.info('Quyền hiện tại chưa thay đổi');
            return;
        }

        setUpdatingRole(true);
        try {
            const res = await requestUpdateUserRole({
                id: selectedUser._id,
                isAdmin: selectedRole,
            });

            const updatedUser = res?.metadata?.user;
            if (updatedUser?._id) {
                setDataUsers((prev) => prev.map((item) => (item._id === updatedUser._id ? updatedUser : item)));
                setSelectedUser(updatedUser);
                setSelectedRole(Boolean(updatedUser.isAdmin));
            }

            message.success(res?.message || 'Cập nhật quyền người dùng thành công');
        } catch (error) {
            message.error(error?.response?.data?.message || 'Không thể cập nhật quyền người dùng');
        } finally {
            setUpdatingRole(false);
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
            title: 'Hành động',
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
            <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                <h2>Quản lý người dùng</h2>
            </Space>

            <Input
                placeholder="Tìm kiếm người dùng"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                style={{ marginBottom: 16, width: 350 }}
            />
            <Table
                rowKey="id"
                columns={columns}
                dataSource={filteredData}
                loading={loading}
                pagination={{ pageSize: 10, showSizeChanger: false }}
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
                            <Descriptions.Item label="Loại tài khoản">
                                {selectedUser.typeLogin === 'google' ? (
                                    <Tag color="orange">Google</Tag>
                                ) : (
                                    <Tag color="green">Email</Tag>
                                )}
                            </Descriptions.Item>
                            {/* <Descriptions.Item label="Trạng thái">
                                {selectedUser.isActive ? <Tag color="green">Đang hoạt động</Tag> : <Tag color="red">Không hoạt động</Tag>}
                            </Descriptions.Item> */}
                            <Descriptions.Item label="Vai trò hiện tại">
                                {selectedUser.isAdmin ? <Tag color="red">Admin</Tag> : <Tag color="blue">Người dùng</Tag>}
                            </Descriptions.Item>
                            <Descriptions.Item label="Ngày tạo">{formatDateTime(selectedUser.createdAt)}</Descriptions.Item>
                            <Descriptions.Item label="Ngày cập nhật">{formatDateTime(selectedUser.updatedAt)}</Descriptions.Item>
                        </Descriptions>

                        <div>
                            <div style={{ marginBottom: 8, fontWeight: 600 }}>Cập nhật quyền</div>
                            <Select
                                value={selectedRole}
                                options={roleOptions}
                                onChange={setSelectedRole}
                                style={{ width: '100%' }}
                            />
                        </div>

                        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                            <Button onClick={handleCloseDetail}>Đóng</Button>
                            <Button
                                type="primary"
                                onClick={handleUpdateRole}
                                loading={updatingRole}
                                disabled={Boolean(selectedUser.isAdmin) === selectedRole}
                            >
                                Cập nhật quyền
                            </Button>
                        </Space>
                    </Space>
                ) : null}
            </Drawer>
        </div>
    );
};

export default UserManagement;