import React, { useEffect, useState } from 'react';
import { Table, Space, Button, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { requestGetAllUser } from '../../../Config/request';

const UserManagement = () => {
    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
        },
        {
            title: 'Tên',
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
    ];

    const [dataUsers, setDataUsers] = useState([]);

    const fetchData = async () => {
        const res = await requestGetAllUser();
        setDataUsers(res.metadata.users);
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
    }));

    return (
        <div>
            <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                <h2>Quản lý người dùng</h2>
                <Input placeholder="Tìm kiếm người dùng" prefix={<SearchOutlined />} />
            </Space>
            <Table columns={columns} dataSource={data} />
        </div>
    );
};

export default UserManagement;
