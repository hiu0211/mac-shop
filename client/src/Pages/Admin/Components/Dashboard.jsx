import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag } from 'antd';
import { UserOutlined, ShoppingCartOutlined, DollarOutlined, SyncOutlined } from '@ant-design/icons';
import { Bar, Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
} from 'chart.js';
import axios from 'axios';
import { requestGetAdminStats } from '../../../Config/request';

// Đăng ký các components cần thiết cho Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        newOrders: 0,
        processingOrders: 0,
        completedOrders: 0,
        todayRevenue: 0,
        weeklyRevenue: [],
        recentOrders: [],
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await requestGetAdminStats();
                setStats(response.metadata);
            } catch (error) {
                console.error('Error fetching stats:', error);
            }
        };

        fetchStats();
        // Cập nhật dữ liệu mỗi 5 phút
        const interval = setInterval(fetchStats, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // Data cho biểu đồ doanh thu theo tuần
    const revenueData = {
        labels: stats.weeklyRevenue.map((day) => day.dayLabel),
        datasets: [
            {
                label: 'Doanh thu (VNĐ)',
                data: stats.weeklyRevenue.map((day) => day.dailyRevenue),
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgb(54, 162, 235)',
                borderWidth: 1,
            },
            {
                label: 'Số đơn hàng',
                data: stats.weeklyRevenue.map((day) => day.orderCount),
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                borderColor: 'rgb(255, 99, 132)',
                borderWidth: 1,
                yAxisID: 'orderCount',
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Biểu đồ doanh thu và đơn hàng 7 ngày gần nhất',
            },
        },
        scales: {
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: {
                    display: true,
                    text: 'Doanh thu (VNĐ)',
                },
            },
            orderCount: {
                type: 'linear',
                display: true,
                position: 'right',
                title: {
                    display: true,
                    text: 'Số đơn hàng',
                },
                grid: {
                    drawOnChartArea: false,
                },
            },
        },
    };

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-6">Tổng quan</h2>
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Tổng số người dùng"
                            value={stats.totalUsers}
                            prefix={<UserOutlined />}
                            valueStyle={{ color: '#3f8600' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Đơn hàng mới"
                            value={stats.newOrders}
                            prefix={<ShoppingCartOutlined />}
                            valueStyle={{ color: '#cf1322' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Đơn đang giao"
                            value={stats.processingOrders}
                            prefix={<SyncOutlined spin />}
                            valueStyle={{ color: '#1677ff' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Doanh thu hôm nay"
                            value={stats.todayRevenue}
                            prefix={<DollarOutlined />}
                            suffix="VNĐ"
                            valueStyle={{ color: '#3f8600' }}
                        />
                    </Card>
                </Col>

                {/* Biểu đồ doanh thu */}
                <Col span={24}>
                    <Card title="Thống kê doanh thu và đơn hàng">
                        <Line data={revenueData} options={chartOptions} />
                    </Card>
                </Col>

                {/* Đơn hàng gần đây */}
                <Col span={24}>
                    <Card title="Đơn hàng gần đây">
                        <Table
                            dataSource={stats.recentOrders}
                            columns={[
                                {
                                    title: 'Mã đơn',
                                    dataIndex: 'order',
                                    key: 'order',
                                },
                                {
                                    title: 'Khách hàng',
                                    dataIndex: 'customer',
                                    key: 'customer',
                                },
                                {
                                    title: 'Sản phẩm',
                                    dataIndex: 'product',
                                    key: 'product',
                                },
                                {
                                    title: 'Tổng tiền',
                                    dataIndex: 'amount',
                                    key: 'amount',
                                    render: (amount) => `${amount?.toLocaleString()} VNĐ`,
                                },
                                {
                                    title: 'Trạng thái',
                                    dataIndex: 'status',
                                    key: 'status',
                                    render: (status) => (
                                        <Tag
                                            color={
                                                status === 'Chờ xử lý'
                                                    ? 'gold'
                                                    : status === 'Đang giao'
                                                    ? 'blue'
                                                    : status === 'Đã giao'
                                                    ? 'green'
                                                    : 'red'
                                            }
                                        >
                                            {status}
                                        </Tag>
                                    ),
                                },
                            ]}
                            pagination={false}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Dashboard;
