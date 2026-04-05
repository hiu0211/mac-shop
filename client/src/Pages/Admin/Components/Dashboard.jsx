import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Avatar,
    Button,
    Card,
    Col,
    DatePicker,
    Empty,
    Row,
    Select,
    Space,
    Spin,
    Statistic,
    Table,
    Tag,
    Typography,
    message,
} from 'antd';
import {
    UserOutlined,
    ShoppingCartOutlined,
    DollarOutlined,
    SyncOutlined,
    WalletOutlined,
    CreditCardOutlined,
    PercentageOutlined,
    ShoppingOutlined,
} from '@ant-design/icons';
import { Line } from 'react-chartjs-2';
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
import dayjs from 'dayjs';
import { requestGetAdminStats, requestGetRevenueStatistics } from '../../../Config/request';

// Đăng ký các components cần thiết cho Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const { RangePicker } = DatePicker;
const { Text } = Typography;

const formatCurrency = (value) => {
    const safeValue = Number(value) || 0;
    return `${safeValue.toLocaleString('vi-VN')} VNĐ`;
};

const groupByOptions = [
    { label: 'Theo ngày', value: 'day' },
    { label: 'Theo tuần', value: 'week' },
    { label: 'Theo tháng', value: 'month' },
];

const defaultRevenueSummary = {
    total_revenue: 0,
    total_orders: 0,
    total_items_sold: 0,
    total_discount: 0,
    average_order_value: 0,
    revenue_cod: 0,
    revenue_vnpay: 0,
    cost_of_goods: 0,
    gross_profit: 0,
    profit_margin: 0,
};

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
    const [statsLoading, setStatsLoading] = useState(false);

    const [dateRange, setDateRange] = useState(() => {
        const endDate = dayjs();
        const startDate = endDate.subtract(29, 'day');
        return [startDate, endDate];
    });

    const [groupBy, setGroupBy] = useState('day');
    const [revenueLoading, setRevenueLoading] = useState(false);
    const [revenueError, setRevenueError] = useState('');
    const initialRevenueFilterRef = useRef({
        range: dateRange,
        groupBy,
    });
    const [revenueDataState, setRevenueDataState] = useState({
        summary: defaultRevenueSummary,
        chart_data: [],
        top_products: [],
    });

    const fetchRevenueStats = useCallback(async ({ range, nextGroupBy } = {}) => {
        const selectedRange = range || initialRevenueFilterRef.current.range;
        const selectedGroupBy = nextGroupBy || initialRevenueFilterRef.current.groupBy;

        if (!Array.isArray(selectedRange) || selectedRange.length !== 2 || !selectedRange[0] || !selectedRange[1]) {
            message.error('Vui lòng chọn khoảng thời gian');
            return;
        }

        const [startDate, endDate] = selectedRange;
        const startDateString = startDate.format('YYYY-MM-DD');
        const endDateString = endDate.format('YYYY-MM-DD');

        setRevenueLoading(true);
        setRevenueError('');

        try {
            const response = await requestGetRevenueStatistics({
                start_date: startDateString,
                end_date: endDateString,
                group_by: selectedGroupBy,
            });

            setRevenueDataState({
                summary: {
                    ...defaultRevenueSummary,
                    ...(response?.metadata?.summary || {}),
                },
                chart_data: response?.metadata?.chart_data || [],
                top_products: response?.metadata?.top_products || [],
            });
        } catch (error) {
            const errorMessage = error?.response?.data?.message || 'Không thể tải thống kê doanh thu';
            setRevenueError(errorMessage);
        } finally {
            setRevenueLoading(false);
        }
    }, []);

    useEffect(() => {
        const fetchStats = async () => {
            setStatsLoading(true);
            try {
                const response = await requestGetAdminStats();
                setStats(response.metadata);
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setStatsLoading(false);
            }
        };

        fetchStats();
        // Cập nhật dữ liệu mỗi 5 phút
        const interval = setInterval(fetchStats, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        fetchRevenueStats({
            range: initialRevenueFilterRef.current.range,
            nextGroupBy: initialRevenueFilterRef.current.groupBy,
        });
    }, [fetchRevenueStats]);

    const revenueTrendData = useMemo(
        () => ({
            labels: revenueDataState.chart_data.map((item) => item.period),
            datasets: [
                {
                    label: 'Doanh thu (VNĐ)',
                    data: revenueDataState.chart_data.map((item) => item.revenue),
                    borderColor: 'rgb(22, 119, 255)',
                    backgroundColor: 'rgba(22, 119, 255, 0.2)',
                    yAxisID: 'revenue',
                    tension: 0.2,
                },
                {
                    label: 'Lợi nhuận (VNĐ)',
                    data: revenueDataState.chart_data.map((item) => item.profit || 0),
                    borderColor: 'rgb(250, 140, 22)',
                    backgroundColor: 'rgba(250, 140, 22, 0.2)',
                    yAxisID: 'revenue',
                    tension: 0.2,
                },
            ],
        }),
        [revenueDataState.chart_data],
    );

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
                text: 'Biểu đồ doanh thu và lợi nhuận theo khoảng thời gian đã chọn',
            },
        },
        scales: {
            revenue: {
                type: 'linear',
                display: true,
                position: 'left',
                title: {
                    display: true,
                    text: 'Doanh thu (VNĐ)',
                },
            },
        },
    };

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-6">Tổng quan</h2>
            <Spin spinning={statsLoading}>
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
                                formatter={(value) => formatCurrency(value)}
                                valueStyle={{ color: '#3f8600' }}
                            />
                        </Card>
                    </Col>

                    <Col span={24}>
                        <Card title="Bộ lọc thống kê doanh thu">
                            <Space wrap>
                                <RangePicker
                                    value={dateRange}
                                    format="YYYY-MM-DD"
                                    allowClear={false}
                                    onChange={(value) => {
                                        if (value?.length === 2 && value[0] && value[1]) {
                                            setDateRange(value);
                                        }
                                    }}
                                />

                                <Select
                                    value={groupBy}
                                    options={groupByOptions}
                                    style={{ width: 160 }}
                                    onChange={(value) => setGroupBy(value)}
                                />

                                <Button
                                    type="primary"
                                    onClick={() => fetchRevenueStats({ range: dateRange, nextGroupBy: groupBy })}
                                >
                                    Áp dụng
                                </Button>
                            </Space>

                            {revenueError ? (
                                <Alert
                                    style={{ marginTop: 16 }}
                                    type="error"
                                    showIcon
                                    message={revenueError}
                                />
                            ) : null}
                        </Card>
                    </Col>

                    <Col xs={24} md={12} lg={8}>
                        <Card>
                            <Statistic
                                title="Tổng doanh thu"
                                value={revenueDataState.summary.total_revenue}
                                prefix={<WalletOutlined />}
                                formatter={(value) => formatCurrency(value)}
                                valueStyle={{ color: '#3f8600' }}
                            />
                        </Card>
                    </Col>

                    <Col xs={24} md={12} lg={8}>
                        <Card>
                            <Statistic
                                title="Số đơn đã giao"
                                value={revenueDataState.summary.total_orders}
                                prefix={<ShoppingCartOutlined />}
                            />
                        </Card>
                    </Col>

                    <Col xs={24} md={12} lg={8}>
                        <Card>
                            <Statistic
                                title="Tổng số lượng bán"
                                value={revenueDataState.summary.total_items_sold}
                                prefix={<ShoppingOutlined />}
                            />
                        </Card>
                    </Col>

                    <Col xs={24} md={12} lg={8}>
                        <Card>
                            <Statistic
                                title="Giảm giá đã áp dụng"
                                value={revenueDataState.summary.total_discount}
                                prefix={<PercentageOutlined />}
                                formatter={(value) => formatCurrency(value)}
                            />
                        </Card>
                    </Col>

                    <Col xs={24} md={12} lg={8}>
                        <Card>
                            <Statistic
                                title="Giá trị đơn trung bình"
                                value={revenueDataState.summary.average_order_value}
                                prefix={<DollarOutlined />}
                                formatter={(value) => formatCurrency(value)}
                            />
                        </Card>
                    </Col>

                    <Col xs={24} md={12} lg={8}>
                        <Card>
                            <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                <Text strong>
                                    <CreditCardOutlined style={{ marginRight: 8 }} />Doanh thu theo phương thức
                                </Text>
                                <Text>COD: {formatCurrency(revenueDataState.summary.revenue_cod)}</Text>
                                <Text>VNPAY: {formatCurrency(revenueDataState.summary.revenue_vnpay)}</Text>
                            </Space>
                        </Card>
                    </Col>

                    <Col xs={24} md={12} lg={8}>
                        <Card>
                            <Statistic
                                title="Chi phí hàng bán (COGS)"
                                value={revenueDataState.summary.cost_of_goods}
                                prefix={<DollarOutlined />}
                                formatter={(value) => formatCurrency(value)}
                                valueStyle={{ color: '#cf1322' }}
                            />
                        </Card>
                    </Col>

                    <Col xs={24} md={12} lg={8}>
                        <Card>
                            <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                <Statistic
                                    title="Lợi nhuận gộp"
                                    value={revenueDataState.summary.gross_profit}
                                    prefix={<WalletOutlined />}
                                    formatter={(value) => formatCurrency(value)}
                                    valueStyle={{
                                        color: revenueDataState.summary.gross_profit >= 0 ? '#3f8600' : '#cf1322',
                                    }}
                                />
                            </Space>
                        </Card>
                    </Col>

                    <Col xs={24} md={12} lg={8}>
                        <Card>
                            <Statistic
                                title="Biên lợi nhuận"
                                value={revenueDataState.summary.profit_margin}
                                suffix="%"
                                precision={2}
                                prefix={<PercentageOutlined />}
                                valueStyle={{
                                    color: revenueDataState.summary.profit_margin >= 0 ? '#3f8600' : '#cf1322',
                                }}
                            />
                        </Card>
                    </Col>

                    {/* Biểu đồ doanh thu */}
                    <Col span={24}>
                        <Card title="Thông kê doanh thu">
                            {revenueLoading ? (
                                <Spin />
                            ) : revenueDataState.chart_data.length > 0 ? (
                                <Line data={revenueTrendData} options={chartOptions} />
                            ) : (
                                <Empty description="Không có dữ liệu trong khoảng thời gian đã chọn" />
                            )}
                        </Card>
                    </Col>

                    <Col span={24}>
                        <Card title="Top 10 sản phẩm theo doanh thu">
                            <Table
                                rowKey="product_id"
                                dataSource={revenueDataState.top_products}
                                pagination={false}
                                columns={[
                                    {
                                        title: 'Sản phẩm',
                                        dataIndex: 'product_name',
                                        key: 'product_name',
                                        render: (_, record) => (
                                            <Space>
                                                <Avatar src={record.product_image || undefined} shape="square" size={46}>
                                                    {record.product_name?.charAt(0) || 'P'}
                                                </Avatar>
                                                <div>
                                                    <div>{record.product_name}</div>
                                                    <Text type="secondary">{record.brand || 'N/A'}</Text>
                                                </div>
                                            </Space>
                                        ),
                                    },
                                    {
                                        title: 'Số lượng bán',
                                        dataIndex: 'quantity_sold',
                                        key: 'quantity_sold',
                                    },
                                    {
                                        title: 'Doanh thu',
                                        dataIndex: 'revenue',
                                        key: 'revenue',
                                        render: (value) => formatCurrency(value),
                                    },
                                    {
                                        title: 'Lợi nhuận',
                                        dataIndex: 'profit',
                                        key: 'profit',
                                        render: (value) => (
                                            <span style={{ color: value >= 0 ? '#3f8600' : '#cf1322' }}>
                                                {formatCurrency(value || 0)}
                                            </span>
                                        ),
                                    },
                                ]}
                            />
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
                                                    status === 'Chờ xác nhận'
                                                        ? 'purple'
                                                        : status === 'Đã xác nhận'
                                                            ? 'orange'
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
            </Spin>
        </div>
    );
};

export default Dashboard;
