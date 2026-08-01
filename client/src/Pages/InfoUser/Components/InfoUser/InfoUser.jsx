import classNames from 'classnames/bind';
import styles from './InfoUser.module.scss';

import { Button, Dropdown, Input, message, Modal, Rate, Upload, Empty, Popconfirm, Drawer, Progress, Tag } from 'antd';
import { Table } from 'antd';
import { DeleteOutlined, DownOutlined, UploadOutlined, HeartFilled, RightOutlined, CrownOutlined, TrophyOutlined } from '@ant-design/icons';
import { useStore } from '../../../../hooks/useStore';
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    requestCancelOrder,
    requestGetHistoryOrder,
    requestGetOrderContactMessages,
    requestDeleteOrderContactMessage,
    requestReorder,
    requestReviewOrderProduct,
    requestSendOrderContactMessage,
    requestUpdateInfoUser,
    requestUploadImage,
    requestGetWishlist,
    requestGetProductById,
    requestRemoveWishlist,
    requestGetVipTiers,
} from '../../../../Config/request';
import ModalUpdatePassword from './ModalUpdatePassword/ModalUpdatePassword';

const cx = classNames.bind(styles);

function InfoUser({ isOpen, setIsOpen }) {
    const { dataUser, refreshWishlist } = useStore();

    const [fullName, setFullName] = useState(dataUser.fullName);
    const [email, setEmail] = useState(dataUser.email);
    const [phone, setPhone] = useState(dataUser.phone);
    const [address, setAddress] = useState(dataUser.address || 'Chưa cập nhật');
    const [allVipTiers, setAllVipTiers] = useState([]);

    useEffect(() => {
        const fetchVipTiers = async () => {
            try {
                const res = await requestGetVipTiers();
                if (res && res.metadata) {
                    setAllVipTiers(res.metadata);
                }
            } catch (err) {
                console.error('Error fetching VIP tiers:', err);
            }
        };
        fetchVipTiers();
    }, []);

    useEffect(() => {
        setFullName(dataUser.fullName);
        setEmail(dataUser.email);
        setPhone(dataUser.phone);
        setAddress(dataUser.address || 'Chưa cập nhật');
    }, [dataUser]);

    const handleUpdateInfoUser = async () => {
        try {
            const data = {
                fullName,
                email,
                phone,
                address,
            };
            await requestUpdateInfoUser(data);
            message.success('Cập nhật thông tin người dùng thành công');
            window.location.reload();
        } catch (error) {
            console.error(error);
            message.error('Cập nhật thông tin người dùng thất bại');
        }
    };

    const [dataOrder, setDataOrder] = useState([]);
    const [isLoadingOrder, setIsLoadingOrder] = useState(false);

    const [cancelOrderId, setCancelOrderId] = useState('');
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [isCancelLoading, setIsCancelLoading] = useState(false);

    const formatPrice = (value) => Number(value || 0).toLocaleString('vi-VN');

    const [contactOrderId, setContactOrderId] = useState('');
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [contactInput, setContactInput] = useState('');
    const [contactMessages, setContactMessages] = useState([]);
    const [isContactLoading, setIsContactLoading] = useState(false);
    const [isDeletingContactMessage, setIsDeletingContactMessage] = useState(false);

    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewOrder, setReviewOrder] = useState(null);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [rating, setRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewFiles, setReviewFiles] = useState([]);
    const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
    // wishlist state
    const [wishlistData, setWishlistData] = useState([]);
    const [isLoadingWishlist, setIsLoadingWishlist] = useState(false);
    const [isWishlistDrawerOpen, setIsWishlistDrawerOpen] = useState(false);
    const mountedRef = useRef(true);

    const loadWishlist = async () => {
        try {
            if (mountedRef.current) setIsLoadingWishlist(true);
            const res = await requestGetWishlist();
            const ids = res?.metadata || [];

            if (!ids || ids.length === 0) {
                if (mountedRef.current) setWishlistData([]);
                return;
            }

            const proms = ids.map((id) =>
                requestGetProductById(id).then((r) => r?.metadata).catch(() => null),
            );

            const products = await Promise.all(proms);
            const valid = products.filter(Boolean);
            if (mountedRef.current) setWishlistData(valid);
        } catch (error) {
            console.error('Error loading wishlist:', error);
            if (mountedRef.current) setWishlistData([]);
        } finally {
            if (mountedRef.current) setIsLoadingWishlist(false);
        }
    };

    useEffect(() => {
        loadWishlist();
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const handleRemoveWishlist = async (productId) => {
        try {
            await requestRemoveWishlist(productId);
            message.success('Đã bỏ khỏi danh sách yêu thích');
            await loadWishlist();
            // refresh provider state so header/counts update
            try {
                await refreshWishlist();
            } catch (error) {
                console.error('Error refreshing wishlist:', error);
            }
        } catch (err) {
            console.error(err);
            message.error(err?.response?.data?.message || 'Bỏ yêu thích thất bại');
        }
    };

    const navigate = useNavigate();

    const fetchOrders = async () => {
        try {
            setIsLoadingOrder(true);
            const res = await requestGetHistoryOrder();
            setDataOrder(res?.metadata?.orders || []);
        } catch (error) {
            console.error(error);
            message.error('Không thể tải danh sách đơn hàng');
        } finally {
            setIsLoadingOrder(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleOpenCancelModal = (orderId) => {
        setCancelOrderId(orderId);
        setIsCancelModalOpen(true);
    };

    const handleCancelOrder = async () => {
        if (!cancelOrderId) return;
        try {
            setIsCancelLoading(true);
            await requestCancelOrder(cancelOrderId);
            message.success('Hủy đơn hàng thành công');
            setIsCancelModalOpen(false);
            setCancelOrderId('');
            await fetchOrders();
        } catch (error) {
            console.error(error);
            message.error(error?.response?.data?.message || 'Hủy đơn hàng thất bại');
        } finally {
            setIsCancelLoading(false);
        }
    };

    const handleReorder = async (orderId) => {
        try {
            await requestReorder(orderId);
            window.dispatchEvent(new Event('cart-updated'));
            message.success('Đã thêm sản phẩm vào giỏ hàng');
            navigate('/cart');
        } catch (error) {
            console.error(error);
            message.error(error?.response?.data?.message || 'Mua lại thất bại');
        }
    };

    const handleOpenContactModal = async (orderId) => {
        setContactOrderId(orderId);
        setIsContactModalOpen(true);
        setContactInput('');
        try {
            setIsContactLoading(true);
            const res = await requestGetOrderContactMessages(orderId);
            setContactMessages(res?.metadata?.contactMessages || []);
        } catch (error) {
            console.error(error);
            message.error(error?.response?.data?.message || 'Không thể tải tin nhắn');
        } finally {
            setIsContactLoading(false);
        }
    };

    const handleSendContactMessage = async () => {
        if (!contactInput.trim() || !contactOrderId) return;
        try {
            setIsContactLoading(true);
            await requestSendOrderContactMessage({
                orderId: contactOrderId,
                message: contactInput.trim(),
            });
            setContactInput('');
            const res = await requestGetOrderContactMessages(contactOrderId);
            setContactMessages(res?.metadata?.contactMessages || []);
            message.success('Đã gửi tin nhắn cho shop');
        } catch (error) {
            console.error(error);
            message.error(error?.response?.data?.message || 'Gửi tin nhắn thất bại');
        } finally {
            setIsContactLoading(false);
        }
    };

    const handleDeleteContactMessage = async (messageId) => {
        if (!contactOrderId || !messageId) {
            message.error('Không tìm thấy tin nhắn để xóa');
            return;
        }

        try {
            setIsDeletingContactMessage(true);
            await requestDeleteOrderContactMessage(contactOrderId, messageId);
            const res = await requestGetOrderContactMessages(contactOrderId);
            setContactMessages(res?.metadata?.contactMessages || []);
            message.success('Xóa tin nhắn thành công');
        } catch (error) {
            console.error(error);
            message.error(error?.response?.data?.message || 'Không thể xóa tin nhắn');
        } finally {
            setIsDeletingContactMessage(false);
        }
    };

    const canDeleteUserMessage = (item) => {
        const currentUserId = dataUser?.id || dataUser?._id;
        if (!currentUserId) return false;
        return item?.senderType === 'user' && String(item?.senderId || '') === String(currentUserId);
    };

    const handleOpenReviewModal = (order) => {
        const reviewedIds = order.reviewedProductIds || [];
        const firstUnReviewed = order.products.find((item) => !reviewedIds.includes(item.productId));
        setReviewOrder(order);
        setSelectedProductId(firstUnReviewed?.productId || order.products?.[0]?.productId || '');
        setRating(5);
        setReviewComment('');
        setReviewFiles([]);
        setIsReviewModalOpen(true);
    };

    const handleSubmitReview = async () => {
        if (!reviewOrder?.orderId || !selectedProductId || rating < 1 || rating > 5) {
            message.error('Vui lòng chọn sản phẩm và số sao hợp lệ');
            return;
        }

        try {
            setIsReviewSubmitting(true);
            let imageUrls = [];

            if (reviewFiles.length > 0) {
                const formData = new FormData();
                reviewFiles.forEach((file) => {
                    formData.append('images', file.originFileObj);
                });
                const uploadRes = await requestUploadImage(formData);
                imageUrls = uploadRes?.metadata || [];
            }

            await requestReviewOrderProduct({
                orderId: reviewOrder.orderId,
                productId: selectedProductId,
                rating,
                comment: reviewComment,
                images: imageUrls,
            });

            message.success('Đánh giá sản phẩm thành công');
            await fetchOrders();
            setIsReviewModalOpen(false);
            setReviewOrder(null);
        } catch (error) {
            console.error(error);
            message.error(error?.response?.data?.message || 'Đánh giá thất bại');
        } finally {
            setIsReviewSubmitting(false);
        }
    };

    const renderStatus = (status) => {
        let color = '';
        let text = '';

        switch (status) {
            case 'pending':
                color = 'purple';
                text = 'Chờ xác nhận';
                break;
            case 'completed':
                color = 'orange';
                text = 'Đã xác nhận';
                break;
            case 'shipping':
                color = '#1677ff';
                text = 'Đang giao hàng';
                break;
            case 'delivered':
                color = '#52c41a';
                text = 'Đã giao hàng';
                break;
            case 'cancelled':
                color = '#ff4d4f';
                text = 'Đã hủy';
                break;
            default:
                color = '#000000';
                text = status;
        }

        return (
            <span
                style={{
                    color,
                    fontWeight: 600,
                }}
            >
                {text}
            </span>
        );
    };

    const renderActionButton = (record) => {
        const items = [
            {
                key: 'contact',
                label: 'Liên hệ shop',
                onClick: () => handleOpenContactModal(record.orderId),
            },
        ];

        if (record.statusOrder === 'pending' || record.statusOrder === 'completed') {
            items.push({
                key: 'cancel',
                danger: true,
                label: <span style={{ color: '#ff4d4f' }}>Hủy Đơn Hàng</span>,
                onClick: () => handleOpenCancelModal(record.orderId),
            });
        }

        if (record.statusOrder === 'delivered') {
            const reviewedIds = record.reviewedProductIds || [];
            const allReviewed = (record.products || []).every((item) => reviewedIds.includes(item.productId));

            items.push({
                key: 'review',
                label: allReviewed ? 'Đã Đánh Giá' : 'Đánh Giá',
                disabled: allReviewed,
                onClick: () => handleOpenReviewModal(record),
            });
        }

        if (record.statusOrder === 'cancelled') {
            items.push({
                key: 'reorder',
                label: 'Mua Lại',
                onClick: () => handleReorder(record.orderId),
            });
        }

        return (
            <Dropdown menu={{ items }} trigger={['click']}>
                <Button>
                    Thêm <DownOutlined />
                </Button>
            </Dropdown>
        );
    };

    const columns = [
        {
            title: 'Tên sản phẩm',
            dataIndex: 'products',
            key: 'products',
            render: (products) => (
                <div style={{ minWidth: '300px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {products.map((p, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
                            <img
                                src={p.image}
                                alt={p.name}
                                style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <span>{p.name}</span>
                                {p.selectedColorName && (
                                    <span style={{ color: '#666', fontSize: 12 }}>
                                        Màu: {p.selectedColorName}
                                    </span>
                                )}
                                <span style={{ color: '#888', fontSize: 13 }}>
                                    x{p.quantity} - {p.price?.toLocaleString('vi-VN')} đ
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            ),
        },
        {
            title: 'Tổng tiền',
            dataIndex: 'totalPrice',
            key: 'totalPrice',
            width: '125px',
            render: (totalPrice) => <span>{totalPrice?.toLocaleString('vi-VN')} đ</span>,
        },
        {
            title: 'Địa chỉ',
            dataIndex: 'address',
            key: 'address',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'statusOrder',
            key: 'statusOrder',
            render: (status) => renderStatus(status),
        },
        {
            title: 'Phương thức',
            dataIndex: 'typePayments',
            key: 'typePayments',
        },
        {
            title: 'Ngày đặt',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => new Date(date).toLocaleDateString('vi-VN'),
        },
        {
            title: 'Thao tác',
            key: 'action',
            align: 'center',
            render: (_, record) => renderActionButton(record),
        },
    ];

    const reviewProduct = reviewOrder?.products?.find((item) => item.productId === selectedProductId);
    const reviewedIds = reviewOrder?.reviewedProductIds || [];

    const getVipCardData = () => {
        const vipTier = dataUser.vipTier || 'none';
        const spending = Number(dataUser.yearlySpending || 0);

        const defaultTiers = [
            { key: 'none', name: 'Thành viên', discountRate: 0, minSpending: 0, color: '#8c8c8c' },
            { key: 'dong', name: 'Đồng', discountRate: 2, minSpending: 5000000, color: '#cd7f32' },
            { key: 'bac', name: 'Bạc', discountRate: 5, minSpending: 20000000, color: '#718096' },
            { key: 'vang', name: 'Vàng', discountRate: 10, minSpending: 50000000, color: '#d69e2e' },
            { key: 'kimcuong', name: 'Kim Cương', discountRate: 15, minSpending: 100000000, color: '#00b5d8' },
        ];

        const tiersList = (allVipTiers && allVipTiers.length > 0) ? allVipTiers : defaultTiers;
        const sortedTiers = [...tiersList].sort((a, b) => (a.minSpending || 0) - (b.minSpending || 0));

        const currentTierObj = sortedTiers.find((t) => t.key === vipTier) || sortedTiers[0];
        const currentTierIdx = sortedTiers.findIndex((t) => t.key === currentTierObj.key);

        let nextTierObj = null;
        if (currentTierIdx !== -1 && currentTierIdx < sortedTiers.length - 1) {
            nextTierObj = sortedTiers[currentTierIdx + 1];
        }

        let progressPercent = 100;
        let remaining = 0;

        if (nextTierObj && nextTierObj.minSpending > 0) {
            const threshold = nextTierObj.minSpending;
            progressPercent = Math.min(100, Math.round((spending / threshold) * 100));
            remaining = Math.max(0, threshold - spending);
        }

        return { currentTierObj, nextTierObj, progressPercent, remaining, spending };
    };

    const vipData = getVipCardData();

    return (
        <div className={cx('wrapper')}>
            {/* --- VIP Membership Card --- */}
            <div className={cx('vipCard')}>
                <div className={cx('vipTop')}>
                    <div className={cx('vipTitle')}>
                        <CrownOutlined style={{ fontSize: '22px', color: vipData.currentTierObj.color }} />
                        <span>{vipData.currentTierObj.key === 'none' ? 'Thành viên' : `Hạng ${vipData.currentTierObj.name}`}</span>
                    </div>
                    <div className={cx('vipDiscountBadge')}>
                        Giảm {vipData.currentTierObj.discountRate ?? vipData.currentTierObj.discount ?? 0}% mọi đơn hàng
                    </div>
                </div>

                <div className={cx('vipBody')}>
                    <div>
                        <div className={cx('spendingLabel')}>Tổng chi tiêu năm {dataUser.spendingYear || new Date().getFullYear()}</div>
                        <div className={cx('spendingValue')}>{vipData.spending.toLocaleString('vi-VN')} đ</div>
                    </div>
                    <div className={cx('vipYear')}>
                        Chu kỳ: 01/01 - 31/12
                    </div>
                </div>

                <div className={cx('vipProgressSection')}>
                    <Progress
                        percent={vipData.progressPercent}
                        strokeColor={vipData.currentTierObj.color || '#38bdf8'}
                        trailColor="rgba(255,255,255,0.2)"
                        showInfo={false}
                    />
                    <div className={cx('progressText')}>
                        {vipData.nextTierObj ? (
                            <>
                                <span>Cần thêm <strong>{vipData.remaining.toLocaleString('vi-VN')} đ</strong> để nâng hạng {vipData.nextTierObj.name}</span>
                                <span>{vipData.progressPercent}%</span>
                            </>
                        ) : (
                            <span>🎉 Bạn đã đạt hạng {vipData.currentTierObj.key === 'none' ? 'Thành viên' : `VIP ${vipData.currentTierObj.name}`} cao nhất!</span>
                        )}
                    </div>
                </div>
            </div>

            <h5>Thông tin cá nhân</h5>
            <div className={cx('form')}>
                <Input
                    size="large"
                    placeholder="Họ và tên"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                />
                <Input size="large" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input
                    size="large"
                    placeholder="Số điện thoại"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                />
            </div>
            <Button onClick={handleUpdateInfoUser} className={cx('btn')} type="primary" size="large">
                Cập nhật
            </Button>

            {/* --- Phần UI Wishlist Mới --- */}
            <div className={cx('wishlistHeader')}>
                <h5>Sản phẩm yêu thích</h5>
                <button type="button" className={cx('seeAll')} onClick={() => setIsWishlistDrawerOpen(true)}>
                    Xem tất cả <RightOutlined style={{ fontSize: '12px' }} />
                </button>
            </div>
            <div className={cx('wishlistSection')}>
                {isLoadingWishlist ? (
                    <p>Đang tải...</p>
                ) : wishlistData.length === 0 ? (
                    <Empty description="Chưa có sản phẩm yêu thích" />
                ) : (
                    <div className={cx('grid')}>
                        {wishlistData.slice(0, 6).map((p) => {
                            const originalPrice = Number(p.price || 0);
                            let discountPercent = 0;
                            let hasDiscount = false;
                            let discountedPrice = originalPrice;
                            let isFlashSale = false;

                            if (p.flashSale) {
                                discountedPrice = Number(p.flashSale.flashSalePrice) || 0;
                                discountPercent = originalPrice > 0 ? Math.max(0, Math.round(((originalPrice - discountedPrice) / originalPrice) * 100)) : 0;
                                hasDiscount = true;
                                isFlashSale = true;
                            } else {
                                const rawDiscount = Number(p.discount);
                                discountPercent = Number.isFinite(rawDiscount)
                                    ? Math.min(Math.max(Math.round(rawDiscount), 0), 100)
                                    : 0;
                                hasDiscount = originalPrice > 0 && discountPercent > 0;
                                discountedPrice = hasDiscount
                                    ? Math.max(0, Math.round((originalPrice * (100 - discountPercent)) / 100))
                                    : originalPrice;
                            }

                            return (
                                <div key={p._id} className={cx('item')} onClick={() => navigate(`/product/${p._id}`)}>
                                    <div className={cx('thumb')}>
                                        <img src={p.images?.[0]} alt={p.name} />
                                    </div>
                                    <div className={cx('info')}>
                                        <div className={cx('title')}>{p.name}</div>
                                        <div className={cx('price')}>
                                            <span className={cx('priceNew')}>{formatPrice(discountedPrice)}đ</span>
                                            {hasDiscount && (
                                                <span className={cx('priceOld')}>{formatPrice(originalPrice)}đ</span>
                                            )}
                                            {isFlashSale && (
                                                <span className={cx('flashSaleTag')} style={{ color: '#ff4d4f', fontWeight: 'bold', marginLeft: '6px', fontSize: '11px', display: 'inline-flex', alignItems: 'center' }}>⚡ Flash Sale</span>
                                            )}
                                        </div>
                                    </div>
                                    <HeartFilled
                                        className={cx('favIcon')}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveWishlist(p._id);
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            {/* --- Kết thúc phần Wishlist --- */}

            <Drawer
                title="Sản phẩm yêu thích của bạn"
                placement="right"
                width={400}
                onClose={() => setIsWishlistDrawerOpen(false)}
                open={isWishlistDrawerOpen}
                footer={<div className={cx('drawerFooter')}><Button onClick={() => setIsWishlistDrawerOpen(false)}>Quay lại</Button></div>}
            >
                <div className={cx('wishlistDrawer')}>
                    {isLoadingWishlist ? (
                        <p>Đang tải...</p>
                    ) : wishlistData.length === 0 ? (
                        <Empty description="Chưa có sản phẩm yêu thích" />
                    ) : (
                        <div className={cx('list')}>
                            {wishlistData.map((p) => {
                                const originalPrice = Number(p.price || 0);
                                let discountPercent = 0;
                                let hasDiscount = false;
                                let discountedPrice = originalPrice;
                                let isFlashSale = false;

                                if (p.flashSale) {
                                    discountedPrice = Number(p.flashSale.flashSalePrice) || 0;
                                    discountPercent = originalPrice > 0 ? Math.max(0, Math.round(((originalPrice - discountedPrice) / originalPrice) * 100)) : 0;
                                    hasDiscount = true;
                                    isFlashSale = true;
                                } else {
                                    const rawDiscount = Number(p.discount);
                                    discountPercent = Number.isFinite(rawDiscount)
                                        ? Math.min(Math.max(Math.round(rawDiscount), 0), 100)
                                        : 0;
                                    hasDiscount = originalPrice > 0 && discountPercent > 0;
                                    discountedPrice = hasDiscount
                                        ? Math.max(0, Math.round((originalPrice * (100 - discountPercent)) / 100))
                                        : originalPrice;
                                }

                                return (
                                    <div
                                        key={p._id}
                                        className={cx('listItem')}
                                        onClick={() => {
                                            setIsWishlistDrawerOpen(false);
                                            navigate(`/product/${p._id}`);
                                        }}
                                    >
                                        <img className={cx('listItemImage')} src={p.images?.[0]} alt={p.name} />
                                        <div className={cx('listItemBody')}>
                                            <div className={cx('listItemTitle')}>{p.name}</div>
                                            <div className={cx('listItemPrice')}>
                                                <span className={cx('priceNew')}>{formatPrice(discountedPrice)}đ</span>
                                                {hasDiscount && (
                                                    <span className={cx('priceOld')}>{formatPrice(originalPrice)}đ</span>
                                                )}
                                                {isFlashSale && (
                                                    <span className={cx('flashSaleTag')} style={{ color: '#ff4d4f', fontWeight: 'bold', marginLeft: '6px', fontSize: '11px', display: 'inline-flex', alignItems: 'center' }}>⚡ FS</span>
                                                )}
                                            </div>
                                        </div>
                                        <HeartFilled
                                            className={cx('listItemFav')}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveWishlist(p._id);
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Drawer>
            <h5>Đơn hàng</h5>
            <div className={cx('table')}>
                <Table
                    bordered
                    dataSource={dataOrder}
                    columns={columns}
                    rowKey="orderId"
                    pagination={{
                        pageSize: 5,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50'],
                        showTotal: (total) => `Tổng ${total} đơn hàng`,
                    }}
                    loading={isLoadingOrder}
                />
            </div>

            <Modal
                title="Xác nhận hủy đơn"
                open={isCancelModalOpen}
                onCancel={() => setIsCancelModalOpen(false)}
                onOk={handleCancelOrder}
                confirmLoading={isCancelLoading}
                okText="Xác nhận"
                cancelText="Đóng"
            >
                Bạn có chắc muốn hủy đơn hàng này?
            </Modal>

            <Modal
                title="Liên hệ shop"
                open={isContactModalOpen}
                onCancel={() => setIsContactModalOpen(false)}
                onOk={handleSendContactMessage}
                okText="Gửi tin nhắn"
                cancelText="Đóng"
                confirmLoading={isContactLoading}
            >
                <div className={cx('chatBox')}>
                    {(contactMessages || []).length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có tin nhắn" />
                    ) : (
                        contactMessages.map((item, index) => (
                            <div
                                key={item._id || `${item.createdAt}-${index}`}
                                className={cx('chatItem', { me: item.senderType === 'user' })}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                                    <div style={{ flex: 1 }}>
                                        <p>{item.message}</p>
                                        <span>
                                            {item.senderType === 'user' ? (
                                                <span style={{ fontWeight: 600, color: '#1677ff' }}>
                                                    Bạn
                                                </span>
                                            ) : (
                                                <span style={{ fontWeight: 600, color: '#f5222d' }}>
                                                    {item.senderName ? `${item.senderName} - Admin` : 'Shop'}
                                                </span>
                                            )}
                                            {' - '}
                                            {new Date(item.createdAt).toLocaleString('vi-VN')}
                                        </span>
                                    </div>
                                    <Popconfirm
                                        title="Xóa tin nhắn"
                                        description="Bạn có chắc muốn xóa tin nhắn này?"
                                        okText="Xóa"
                                        cancelText="Hủy"
                                        onConfirm={() => handleDeleteContactMessage(item._id)}
                                        disabled={!item._id || !canDeleteUserMessage(item)}
                                    >
                                        <Button
                                            danger
                                            size="small"
                                            icon={<DeleteOutlined />}
                                            loading={isDeletingContactMessage}
                                            disabled={!item._id || !canDeleteUserMessage(item)}
                                        />
                                    </Popconfirm>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <Input.TextArea
                    rows={4}
                    placeholder="Nhập nội dung cần hỗ trợ..."
                    value={contactInput}
                    onChange={(e) => setContactInput(e.target.value)}
                />
            </Modal>

            <Modal
                title="Đánh giá sản phẩm"
                open={isReviewModalOpen}
                onCancel={() => setIsReviewModalOpen(false)}
                onOk={handleSubmitReview}
                okText="Gửi đánh giá"
                cancelText="Đóng"
                confirmLoading={isReviewSubmitting}
            >
                <div className={cx('reviewProductList')}>
                    {(reviewOrder?.products || []).map((item) => {
                        const isActive = item.productId === selectedProductId;
                        const reviewed = reviewedIds.includes(item.productId);
                        return (
                            <button
                                key={item.productId}
                                type="button"
                                className={cx('reviewProductItem', { active: isActive })}
                                onClick={() => setSelectedProductId(item.productId)}
                                disabled={reviewed}
                            >
                                <img src={item.image} alt={item.name} />
                                <div>
                                    <p>{item.name}</p>
                                    <span>{reviewed ? 'Đã đánh giá' : 'Chưa đánh giá'}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {reviewProduct && (
                    <div className={cx('reviewEditor')}>
                        <div className={cx('reviewHeader')}>
                            <img src={reviewProduct.image} alt={reviewProduct.name} />
                            <p>{reviewProduct.name}</p>
                        </div>
                        <div className={cx('reviewField')}>
                            <span>Số sao</span>
                            <Rate value={rating} onChange={setRating} />
                        </div>
                        <div className={cx('reviewField')}>
                            <span>Nhận xét</span>
                            <Input.TextArea
                                rows={4}
                                placeholder="Chia sẻ trải nghiệm sử dụng (không bắt buộc)"
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                            />
                        </div>
                        <div className={cx('reviewField')}>
                            <span>Ảnh đính kèm</span>
                            <Upload
                                multiple
                                listType="picture"
                                beforeUpload={() => false}
                                fileList={reviewFiles}
                                onChange={({ fileList }) => setReviewFiles(fileList)}
                            >
                                <Button icon={<UploadOutlined />}>Chọn ảnh</Button>
                            </Upload>
                        </div>
                    </div>
                )}
            </Modal>

            <ModalUpdatePassword isOpen={isOpen} setIsOpen={setIsOpen} />
        </div>
    );
}

export default InfoUser;