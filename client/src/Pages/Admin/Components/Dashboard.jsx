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
    Table,
    Tag,
    Typography,
    Tooltip,
    Tabs,
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
    FilterOutlined,
    ClockCircleOutlined,
    CarOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
} from '@ant-design/icons';
import { Line, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title as ChartTitle,
    Tooltip as ChartTooltip,
    Legend as ChartLegend,
    ArcElement,
    Filler,
} from 'chart.js';
import dayjs from 'dayjs';
import classNames from 'classnames/bind';
import styles from './Dashboard.module.scss';
import { requestGetAdminStats, requestGetRevenueStatistics } from '../../../Config/request';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ChartTitle,
    ChartTooltip,
    ChartLegend,
    ArcElement,
    Filler
);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const cx = classNames.bind(styles);

const formatCurrency = (value) => {
    const safeValue = Number(value) || 0;
    return `${safeValue.toLocaleString('vi-VN')} đ`;
};

const formatRevenueChartLabel = (period) => {
    if (typeof period !== 'string') {
        return '';
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
        return dayjs(period).format('DD/MM/YYYY');
    }

    if (/^\d{4}-\d{2}$/.test(period)) {
        return dayjs(`${period}-01`).format('MM/YYYY');
    }

    const weekMatch = period.match(/^(\d{4})-W(\d{2})$/);
    if (weekMatch) {
        return `Tuần ${weekMatch[2]}/${weekMatch[1]}`;
    }

    return period;
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

const ORDER_STATUS_MAP = {
    'Chờ xác nhận': { color: 'warning', text: 'Chờ xác nhận', icon: <ClockCircleOutlined /> },
    'Đã xác nhận': { color: 'processing', text: 'Đã xác nhận', icon: <SyncOutlined /> },
    'Đang giao': { color: 'blue', text: 'Đang giao', icon: <CarOutlined /> },
    'Đã giao': { color: 'success', text: 'Đã giao', icon: <CheckCircleOutlined /> },
    'Đã hủy': { color: 'error', text: 'Đã hủy', icon: <CloseCircleOutlined /> },
};

// Sub-components
function StatCard({ icon, label, value, sub, colorClass }) {
    return (
        <Card className={cx('stat-card-modern', colorClass)}>
            <div className={cx('stat-card-modern__header')}>
                <span className={cx('stat-card-modern__label')}>{label}</span>
                <div className={cx('stat-card-modern__icon')}>{icon}</div>
            </div>
            <div className={cx('stat-card-modern__value')}>{value}</div>
            {sub && <div className={cx('stat-card-modern__sub')}>{sub}</div>}
        </Card>
    );
}

function MiniMetric({ label, value, isPrice = true, trend, valueClass }) {
    return (
        <div className={cx('mini-metric')}>
            <span className={cx('mini-metric__label')}>{label}</span>
            <span className={cx('mini-metric__value', valueClass)}>
                {isPrice ? formatCurrency(value) : value.toLocaleString('vi-VN')}
                {trend && (
                    <span className={cx('mini-metric__trend', trend >= 0 ? 'up' : 'down')}>
                        {trend >= 0 ? '+' : ''}{trend}%
                    </span>
                )}
            </span>
        </div>
    );
}

function ProductCell({ image, name, subText }) {
    const isFallback = !name || name.includes('không tồn tại');
    return (
        <div className={cx('product-cell-layout')}>
            {image ? (
                <img src={image} alt={name} className={cx('product-img-v2')} />
            ) : (
                <div className={cx('product-img-v2-placeholder', isFallback && 'error-place')}>
                    <span>{isFallback ? 'ERR' : (name || 'SP').slice(0, 2).toUpperCase()}</span>
                </div>
            )}
            <div className={cx('product-cell-info')}>
                <Tooltip title={name || 'Sản phẩm không khả dụng'}>
                    <div className={cx('product-name-v2', isFallback && 'muted-name')}>
                        {name || 'Sản phẩm không khả dụng'}
                    </div>
                </Tooltip>
                {subText && <span style={{ color: '#8c8c8c', fontSize: '12px' }}>{subText}</span>}
            </div>
        </div>
    );
}

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        newOrders: 0,
        processingOrders: 0,
        completedOrders: 0,
        todayRevenue: 0,
        weeklyRevenue: [],
        recentOrders: [],
        orderStatusCounts: {},
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
        top_customers: [],
    });

    const [orderStatusFilter, setOrderStatusFilter] = useState('all');

    const filteredOrders = useMemo(() => {
        if (orderStatusFilter === 'all') return stats.recentOrders;
        return stats.recentOrders.filter((o) => o.status === orderStatusFilter);
    }, [stats.recentOrders, orderStatusFilter]);

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
                top_customers: response?.metadata?.top_customers || [],
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
            labels: revenueDataState.chart_data.map((item) => formatRevenueChartLabel(item.period)),
            datasets: [
                {
                    label: 'Doanh thu',
                    data: revenueDataState.chart_data.map((item) => item.revenue),
                    borderColor: '#1677ff',
                    backgroundColor: 'rgba(22, 119, 255, 0.03)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2,
                    pointRadius: 2,
                },
                {
                    label: 'Lợi nhuận',
                    data: revenueDataState.chart_data.map((item) => item.profit || 0),
                    borderColor: '#52c41a',
                    backgroundColor: 'rgba(82, 196, 26, 0.03)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2,
                    pointRadius: 2,
                },
            ],
        }),
        [revenueDataState.chart_data],
    );

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { position: 'top', labels: { boxWidth: 10, font: { family: 'Inter' } } },
            tooltip: {
                callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}` }
            }
        },
        scales: {
            y: {
                grid: { color: '#f0f0f0' },
                ticks: {
                    callback: (val) => val >= 1e6 ? `${(val / 1e6).toFixed(1)}M` : val
                }
            },
            x: { grid: { display: false } }
        }
    };

    const orderStatusChartData = useMemo(() => {
        const counts = stats.orderStatusCounts || {};
        const labels = ['Đã hoàn thành', 'Đã hủy'];
        const dataKeys = ['delivered', 'cancelled'];
        const data = dataKeys.map(key => counts[key] || 0);
        const hasData = data.some(val => val > 0);

        return {
            labels,
            datasets: [
                {
                    data: hasData ? data : [1],
                    backgroundColor: [
                        '#52c41a', // green
                        '#f5222d', // red
                    ],
                    borderWidth: 1,
                }
            ],
            hasData
        };
    }, [stats.orderStatusCounts]);

    const totalOrdersCount = useMemo(() => {
        const counts = stats.orderStatusCounts || {};
        return (counts['delivered'] || 0) + (counts['cancelled'] || 0);
    }, [stats.orderStatusCounts]);

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    boxWidth: 12,
                    font: { family: 'Inter' },
                    generateLabels: (chart) => {
                        const data = chart.data;
                        if (data.labels.length && data.datasets.length) {
                            return data.labels.map((label, i) => {
                                const value = (stats.orderStatusCounts || {})[['delivered', 'cancelled'][i]] || 0;
                                const percent = totalOrdersCount ? ((value / totalOrdersCount) * 100).toFixed(1) : 0;
                                return {
                                    text: `${label}: ${value} Đơn (${percent}%)`,
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    strokeStyle: data.datasets[0].backgroundColor[i],
                                    lineWidth: 0,
                                    hidden: false,
                                    index: i
                                };
                            });
                        }
                        return [];
                    }
                },
            },
        },
        cutout: '65%',
    };

    if (statsLoading && !stats.totalUsers) {
        return <div className={cx('loading-container')}><Spin size="large" tip="Đang tải dữ liệu..." /></div>;
    }

    return (
        <div className={cx('dashboard-container')}>
            {/* Header */}
            <div className={cx('dash-header')}>
                <div>
                    <Title level={3} style={{ margin: 0, fontWeight: 700 }}>Tổng quan hệ thống</Title>
                    <Text type="secondary">Cập nhật dữ liệu thời gian thực bán hàng</Text>
                </div>
                <div className={cx('realtime-badge')}>
                    <span className={cx('dot')}></span> Dữ liệu: {dayjs().format('HH:mm - DD/MM/YYYY')}
                </div>
            </div>

            {/* Thống kê Tổng Quát */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard icon={<UserOutlined />} label="Tổng số người dùng" value={stats.totalUsers.toLocaleString('vi-VN')} sub="Người dùng trong hệ thống" colorClass="blue-card" />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard icon={<ShoppingCartOutlined />} label="Đơn hàng mới" value={stats.newOrders.toLocaleString('vi-VN')} sub="Đơn hàng chờ xác nhận" colorClass="purple-card" />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard icon={<SyncOutlined spin={statsLoading} />} label="Đơn đang giao" value={stats.processingOrders.toLocaleString('vi-VN')} sub="Đơn hàng đang vận chuyển" colorClass="amber-card" />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard icon={<DollarOutlined />} label="Doanh thu hôm nay" value={formatCurrency(stats.todayRevenue)} sub="Doanh thu ngày hôm nay" colorClass="green-card" />
                </Col>
            </Row>

            {/* Thanh điều khiển lọc doanh thu */}
            <Card className={cx('control-card')} bodyStyle={{ padding: '14px 20px' }}>
                <div className={cx('control-flex')}>
                    <Space size={12} className={cx('filter-title-space')}>
                        <FilterOutlined style={{ color: '#1677ff' }} />
                        <Text strong>Bộ lọc báo cáo doanh thu kinh doanh</Text>
                    </Space>
                    <Space size={10} className={cx('action-controls')} wrap>
                        <RangePicker value={dateRange} format="DD/MM/YYYY" allowClear={false} onChange={val => val && setDateRange(val)} />
                        <Select value={groupBy} options={groupByOptions} style={{ width: 130 }} onChange={val => setGroupBy(val)} />
                        <Button type="primary" onClick={() => fetchRevenueStats({ range: dateRange, nextGroupBy: groupBy })}>Áp dụng bộ lọc</Button>
                    </Space>
                </div>
                {revenueError && <Alert type="error" showIcon style={{ marginTop: 12 }} message={revenueError} />}
            </Card>

            {/* Khu vực Biểu đồ xu hướng & Báo cáo tài chính nhanh */}
            <Spin spinning={revenueLoading}>
                <Row gutter={[20, 20]} style={{ marginBottom: 24, display: 'flex', alignItems: 'stretch' }}>
                    {/* Cột trái: Biểu đồ xu hướng chính */}
                    <Col xs={24} xl={16} style={{ display: 'flex', flexDirection: 'column' }}>
                        <Card title="Biểu đồ thống kê doanh thu lợi nhuận" className={cx('main-chart-card')}>
                            <div className={cx('chart-box')}>
                                {revenueDataState.chart_data.length > 0 ? (
                                    <Line data={revenueTrendData} options={chartOptions} />
                                ) : (
                                    <Empty description="Không có dữ liệu trong khoảng thời gian đã chọn" />
                                )}
                            </div>
                        </Card>
                    </Col>

                    {/* Cột phải: Bảng tài chính nhanh */}
                    <Col xs={24} xl={8} style={{ display: 'flex', flexDirection: 'column' }}>
                        <Card title="Báo cáo tài chính nhanh" className={cx('finance-summary-card')}>
                            <div className={cx('revenue-primary-display')}>
                                <Text type="secondary">Tổng doanh thu kỳ báo cáo</Text>
                                <Title level={2} style={{ margin: '4px 0 12px', color: '#1677ff', fontWeight: 700 }}>
                                    {formatCurrency(revenueDataState.summary.total_revenue)}
                                </Title>
                            </div>

                            <div className={cx('financial-grid')}>
                                <MiniMetric label="Tổng lợi nhuận" value={revenueDataState.summary.gross_profit} valueClass={revenueDataState.summary.gross_profit >= 0 ? 'kpi-value--profit' : 'kpi-value--negative'} />
                                <MiniMetric label="Tỷ lệ lợi nhuận" value={`${revenueDataState.summary.profit_margin.toFixed(2)} %`} isPrice={false} valueClass={revenueDataState.summary.profit_margin >= 0 ? 'kpi-value--profit' : 'kpi-value--negative'} />
                                <MiniMetric label="Giá trị đơn trung bình" value={revenueDataState.summary.average_order_value} />
                                <MiniMetric label="Tổng đơn hàng" value={revenueDataState.summary.total_orders} isPrice={false} />
                                <MiniMetric label="Số sản phẩm đã bán" value={revenueDataState.summary.total_items_sold} isPrice={false} />
                                <MiniMetric label="Ưu đãi đã áp dụng" value={revenueDataState.summary.total_discount} valueClass="kpi-value--negative" />
                            </div>

                            <div className={cx('payment-split-section')}>
                                <div className={cx('split-item')}>
                                    <Text type="secondary"><WalletOutlined /> Doanh thu thanh toán COD</Text>
                                    <span className={cx('split-val')}>{formatCurrency(revenueDataState.summary.revenue_cod)}</span>
                                </div>
                                <div className={cx('split-item')}>
                                    <Text type="secondary"><PercentageOutlined /> Doanh thu thanh toán VNPAY</Text>
                                    <span className={cx('split-val')}>{formatCurrency(revenueDataState.summary.revenue_vnpay)}</span>
                                </div>
                            </div>
                        </Card>
                    </Col>
                </Row>
            </Spin>

            {/* Tỷ lệ trạng thái đơn hàng (Doughnut Chart) */}
            <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
                <Col span={24}>
                    <Card title="Phân tích tỷ lệ trạng thái đơn hàng" className={cx('pie-card-v2')}>
                        <div style={{ height: 260, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            {totalOrdersCount > 0 ? (
                                <Doughnut data={orderStatusChartData} options={doughnutOptions} />
                            ) : (
                                <Empty description="Chưa có dữ liệu trạng thái đơn hàng" />
                            )}
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Bảng Đơn Hàng Gần Đây */}
            <Card title="Đơn hàng gần đây" className={cx('main-table-card')} style={{ marginBottom: 24 }}>
                <Tabs activeKey={orderStatusFilter} onChange={setOrderStatusFilter} size="middle" style={{ marginBottom: 16 }}
                    items={[
                        { key: 'all', label: 'Tất cả đơn' },
                        { key: 'Chờ xác nhận', label: 'Chờ xác nhận' },
                        { key: 'Đã xác nhận', label: 'Đã xác nhận' },
                        { key: 'Đang giao', label: 'Đang giao' },
                        { key: 'Đã giao', label: 'Hoàn thành' },
                        { key: 'Đã hủy', label: 'Đã hủy' },
                    ]}
                />
                <Table
                    columns={[
                        { title: 'Mã đơn', dataIndex: 'order', key: 'order', render: v => <span style={{ fontWeight: 600 }}>{v || 'N/A'}</span> },
                        { title: 'Khách hàng', dataIndex: 'customer', key: 'customer', render: v => <span style={{ fontWeight: 600 }}>{v || 'Guest'}</span> },
                        {
                            title: 'Sản phẩm mua',
                            dataIndex: 'product',
                            key: 'product',
                            render: v => (
                                <Tooltip title={v || 'Sản phẩm'}>
                                    <span
                                        className={cx('text-ellipsis')}
                                        style={{ display: 'block', cursor: 'default' }}
                                    >
                                        {v || 'Sản phẩm'}
                                    </span>
                                </Tooltip>
                            )
                        },
                        { title: 'Thời gian đặt', dataIndex: 'orderDate', key: 'orderDate', render: v => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : 'N/A' },
                        { title: 'Tổng tiền', dataIndex: 'amount', key: 'amount', render: v => <span className={cx('text-bold')}>{formatCurrency(v)}</span> },
                        {
                            title: 'Trạng thái', dataIndex: 'status', key: 'status', render: v => {
                                const cfg = ORDER_STATUS_MAP[v] || { color: 'default', text: v };
                                return <Tag color={cfg.color} icon={cfg.icon}>{cfg.text}</Tag>;
                            }
                        },
                    ]}
                    dataSource={filteredOrders}
                    pagination={{ pageSize: 5, showSizeChanger: true, showTotal: (total) => `Tổng ${total} đơn hàng` }}
                    size="middle"
                />
            </Card>

            {/* Top 10 sản phẩm theo doanh thu */}
            <Card title="Top 10 sản phẩm theo doanh thu" className={cx('main-table-card')} style={{ marginBottom: 24 }}>
                <Table
                    rowKey="product_id"
                    dataSource={revenueDataState.top_products}
                    pagination={false}
                    size="middle"
                    columns={[
                        {
                            title: 'Sản phẩm',
                            dataIndex: 'product_name',
                            key: 'product_name',
                            render: (_, record) => (
                                <ProductCell
                                    image={record.product_image}
                                    name={record.product_name}
                                    subText={record.brand || 'N/A'}
                                />
                            ),
                        },
                        {
                            title: 'Số lượng bán',
                            dataIndex: 'quantity_sold',
                            key: 'quantity_sold',
                            align: 'center',
                        },
                        {
                            title: 'Giá bán TB',
                            dataIndex: 'average_unit_price',
                            key: 'average_unit_price',
                            align: 'right',
                            render: (value) => <span className={cx('text-bold')}>{formatCurrency(value)}</span>,
                        },
                        {
                            title: 'Doanh thu',
                            dataIndex: 'revenue',
                            key: 'revenue',
                            align: 'right',
                            render: (value) => <span className={cx('text-bold')}>{formatCurrency(value)}</span>,
                        },
                        {
                            title: 'Lợi nhuận',
                            dataIndex: 'profit',
                            key: 'profit',
                            align: 'right',
                            render: (value) => (
                                <span className={cx(value >= 0 ? 'text-success' : 'text-danger')}>
                                    {formatCurrency(value || 0)}
                                </span>
                            ),
                        },
                    ]}
                />
            </Card>

            {/* Top 10 khách hàng theo doanh thu */}
            <Card title="Top 10 khách hàng theo doanh thu" className={cx('main-table-card')}>
                <Table
                    rowKey={(record, index) => record.customer_id || `customer-${index}`}
                    dataSource={revenueDataState.top_customers}
                    pagination={false}
                    size="middle"
                    columns={[
                        {
                            title: 'Khách hàng',
                            dataIndex: 'customer_name',
                            key: 'customer_name',
                            render: (value) => <span style={{ fontWeight: 600 }}>{value || 'Khách hàng'}</span>,
                        },
                        {
                            title: 'Số đơn hàng',
                            dataIndex: 'order_count',
                            key: 'order_count',
                            align: 'center',
                        },
                        {
                            title: 'SL đã mua',
                            dataIndex: 'items_sold',
                            key: 'items_sold',
                            align: 'center',
                        },
                        {
                            title: 'Doanh thu',
                            dataIndex: 'revenue',
                            key: 'revenue',
                            align: 'right',
                            render: (value) => <span className={cx('text-bold')}>{formatCurrency(value)}</span>,
                        },
                        {
                            title: 'Giá trị đơn TB',
                            dataIndex: 'average_order_value',
                            key: 'average_order_value',
                            align: 'right',
                            render: (value) => formatCurrency(value),
                        },
                    ]}
                />
            </Card>
        </div>
    );
};

export default Dashboard;
