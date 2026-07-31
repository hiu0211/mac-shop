const modelUser = require('../models/users.model');
const modelPayments = require('../models/payments.model');

/**
 * Bảng thông tin Hạng VIP
 */
const VIP_TIER_CONFIG = {
    none: {
        key: 'none',
        name: 'Thành viên',
        minSpending: 0,
        discountRate: 0,
        color: '#8c8c8c',
    },
    dong: {
        key: 'dong',
        name: 'Đồng',
        minSpending: 5000000, // > 5.000.000đ
        discountRate: 2,
        color: '#cd7f32',
    },
    bac: {
        key: 'bac',
        name: 'Bạc',
        minSpending: 20000000, // > 20.000.000đ
        discountRate: 5,
        color: '#c0c0c0',
    },
    vang: {
        key: 'vang',
        name: 'Vàng',
        minSpending: 50000000, // > 50.000.000đ
        discountRate: 10,
        color: '#ffd700',
    },
    kimcuong: {
        key: 'kimcuong',
        name: 'Kim cương',
        minSpending: 100000000, // > 100.000.000đ
        discountRate: 15,
        color: '#b9f2ff',
    },
};

const TIER_ORDER = ['none', 'dong', 'bac', 'vang', 'kimcuong'];

/**
 * Lấy % giảm giá theo hạng VIP
 */
const getDiscountRateByTier = (vipTier) => {
    const tier = VIP_TIER_CONFIG[vipTier];
    return tier ? tier.discountRate : 0;
};

/**
 * Tính toán hạng VIP dựa trên tổng chi tiêu năm (Quy tắc strictly >)
 */
const calculateTierFromSpending = (spendingAmount) => {
    const spending = Number(spendingAmount) || 0;
    if (spending > 100000000) return 'kimcuong';
    if (spending > 50000000) return 'vang';
    if (spending > 20000000) return 'bac';
    if (spending > 5000000) return 'dong';
    return 'none';
};

/**
 * Lấy thông tin mốc tiến trình lên hạng tiếp theo
 */
const getNextTierInfo = (currentTier, yearlySpending) => {
    const spending = Number(yearlySpending) || 0;
    const currentIdx = TIER_ORDER.indexOf(currentTier) >= 0 ? TIER_ORDER.indexOf(currentTier) : 0;

    if (currentIdx >= TIER_ORDER.length - 1) {
        // Đã đạt hạng cao nhất (Kim cương)
        return {
            isMaxTier: true,
            nextTierName: null,
            nextTierThreshold: 100000000,
            remainingAmount: 0,
            progressPercent: 100,
        };
    }

    const nextTierKey = TIER_ORDER[currentIdx + 1];
    const nextTier = VIP_TIER_CONFIG[nextTierKey];
    const nextTierThreshold = nextTier.minSpending;

    const remainingAmount = Math.max(0, nextTierThreshold - spending);
    const progressPercent = Math.min(100, Math.round((spending / nextTierThreshold) * 100));

    return {
        isMaxTier: false,
        nextTierKey,
        nextTierName: nextTier.name,
        nextTierThreshold,
        remainingAmount,
        progressPercent,
    };
};

/**
 * Tự động kiểm tra & reset năm tài chính nếu bước sang năm mới
 * Return true nếu có thay đổi (cần save)
 */
const ensureCurrentYearUserTier = async (user) => {
    if (!user) return false;
    const currentYear = new Date().getFullYear();
    if (Number(user.spendingYear) !== currentYear) {
        user.yearlySpending = 0;
        user.vipTier = 'none';
        user.spendingYear = currentYear;
        if (typeof user.save === 'function') {
            await user.save();
        }
        return true;
    }
    return false;
};

/**
 * Cập nhật tăng hạng khách hàng khi đơn hàng chuyển sang 'delivered' (Đã giao)
 * Idempotent: Nếu order.tierCounted === true thì bỏ qua
 */
const updateCustomerTier = async (userId, orderId) => {
    if (!userId || !orderId) return null;

    const order = await modelPayments.findById(orderId);
    if (!order) return null;

    // Đơn hàng đã được tính toán doanh số trước đó -> idempotent skip
    if (order.tierCounted) {
        return null;
    }

    const user = await modelUser.findById(userId);
    if (!user) return null;

    // Reset nếu bước sang năm mới trước khi cộng đơn
    await ensureCurrentYearUserTier(user);

    const orderAmount = Number(order.totalPrice) || 0;
    user.yearlySpending = Math.max(0, Number(user.yearlySpending || 0) + orderAmount);

    // Xác định hạng mới dựa trên tổng chi tiêu lũy kế năm
    const newTier = calculateTierFromSpending(user.yearlySpending);
    user.vipTier = newTier;
    await user.save();

    // Đánh dấu đơn đã được cộng vào doanh số năm
    order.tierCounted = true;
    await order.save();

    return user;
};

/**
 * Trừ doanh số & hạ hạng khách hàng khi đơn đã tính doanh số bị hủy/hoàn tiền
 * Idempotent: Nếu order.tierCounted === false thì bỏ qua
 */
const revertCustomerTier = async (userId, orderId) => {
    if (!userId || !orderId) return null;

    const order = await modelPayments.findById(orderId);
    if (!order) return null;

    // Đơn hàng chưa từng được tính vào doanh số năm -> không cần trừ
    if (!order.tierCounted) {
        return null;
    }

    const user = await modelUser.findById(userId);
    if (!user) {
        order.tierCounted = false;
        await order.save();
        return null;
    }

    const currentYear = new Date().getFullYear();
    const isSameYear = Number(user.spendingYear) === currentYear;

    if (!isSameYear) {
        // Đơn thuộc năm cũ, user đã bước sang năm mới -> không trừ chi tiêu năm mới
        order.tierCounted = false;
        await order.save();
        return user;
    }

    // Trừ lại tiền đơn hàng bị hủy
    const orderAmount = Number(order.totalPrice) || 0;
    user.yearlySpending = Math.max(0, Number(user.yearlySpending || 0) - orderAmount);

    // Tính toán lại hạng tương ứng với số tiền chi tiêu mới (có thể bị hạ hạng)
    const newTier = calculateTierFromSpending(user.yearlySpending);
    user.vipTier = newTier;
    await user.save();

    // Đánh dấu đơn chưa được cộng vào doanh số
    order.tierCounted = false;
    await order.save();

    return user;
};

module.exports = {
    VIP_TIER_CONFIG,
    TIER_ORDER,
    getDiscountRateByTier,
    calculateTierFromSpending,
    getNextTierInfo,
    ensureCurrentYearUserTier,
    updateCustomerTier,
    revertCustomerTier,
};
