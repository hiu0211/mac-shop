import React, { useEffect, useState } from 'react';
import { Table, Space, Input, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { requestGetAllUser } from '../../../Config/request';

const UserManagement = () => {
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
                isAdmin ? (
                    <Tag color="red">Admin</Tag>
                ) : (
                    <Tag color="blue">Người dùng</Tag>
                ),
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
                typeLogin === 'google' ? (
                    <Tag color="orange">Google</Tag>
                ) : (
                    <Tag color="green">Email</Tag>
                ),
            filters: [
                { text: 'Google', value: 'google' },
                { text: 'Email', value: 'email' },
            ],
            onFilter: (value, record) => record.typeLogin === value,
        },
        
    ];

    const [dataUsers, setDataUsers] = useState([]);
    const [searchText, setSearchText] = useState('');

    const fetchData = async () => {
        try {
            const res = await requestGetAllUser();
            setDataUsers(res.metadata.users);
        } catch (error) {
            console.error('Lỗi khi lấy danh sách người dùng:', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const data = dataUsers.map((user) => ({
        key: user._id,
        id: user._id,
        name: user.fullName,
        email: user.email,
        phone: user.phone,
        isAdmin: user.isAdmin,
        typeLogin: user.typeLogin,
    }));

    // Lọc dữ liệu dựa trên searchText
    const filteredData = data.filter((item) => {
        const searchLower = searchText.toLowerCase();
        return (
            item.name?.toLowerCase().includes(searchLower) ||
            item.email?.toLowerCase().includes(searchLower) ||
            item.phone?.toLowerCase().includes(searchLower)
        );
    });

    return (
        <div>
            <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                <h2>Quản lý người dùng</h2>
                <Input
                    placeholder="Tìm kiếm người dùng"
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                    style={{ width: 350 }}
                />
            </Space>
            <Table columns={columns} dataSource={filteredData} />
        </div>
    );
};

export default UserManagement;