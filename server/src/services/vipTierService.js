const modelUser = require('../models/users.model');
const modelPayments = require('../models/payments.model');
const modelVipTier = require('../models/vipTier.model');
const mongoose = require('mongoose');

/**
 * Tự động chuyển đổi Tên hạng -> Key ASCII không dấu
 * Ví dụ: "Bạch Kim" -> "bachkim", "Kim Cương" -> "kimcuong"
 */
const slugifyKey = (name) => {
    if (!name || typeof name !== 'string') return '';
    return name
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'd')
        .replace(/[^a-z0-9]/g, '');
};

/**
 * Cấu hình hạng mặc định để khởi tạo dữ liệu ban đầu
 */
const DEFAULT_VIP_TIERS = [
    { key: 'none', name: 'Thành viên', minSpending: 0, discountRate: 0, color: '#8c8c8c', orderIndex: 0 },
    { key: 'dong', name: 'Đồng', minSpending: 5000000, discountRate: 2, color: '#cd7f32', orderIndex: 1 },
    { key: 'bac', name: 'Bạc', minSpending: 20000000, discountRate: 5, color: '#c0c0c0', orderIndex: 2 },
    { key: 'vang', name: 'Vàng', minSpending: 50000000, discountRate: 10, color: '#ffd700', orderIndex: 3 },
    { key: 'kimcuong', name: 'Kim cương', minSpending: 100000000, discountRate: 15, color: '#b9f2ff', orderIndex: 4 },
];

/**
 * Khởi tạo dữ liệu mặc định nếu Database chưa có
 */
const ensureDefaultTiers = async () => {
    try {
        const count = await modelVipTier.countDocuments();
        if (count === 0) {
            await modelVipTier.insertMany(DEFAULT_VIP_TIERS);
        }
    } catch (error) {
        console.error('Error seeding default VIP tiers:', error);
    }
};

/**
 * Lấy danh sách hạng VIP sắp xếp theo minSpending tăng dần
 */
const getAllVipTiers = async () => {
    await ensureDefaultTiers();
    const tiers = await modelVipTier.find({}).sort({ minSpending: 1, orderIndex: 1 }).lean();
    return tiers;
};

/**
 * Lấy bảng VIP_TIER_CONFIG map theo key
 */
const getVipTierConfigMap = async () => {
    const tiers = await getAllVipTiers();
    const configMap = {};
    tiers.forEach((tier) => {
        configMap[tier.key] = tier;
    });
    return configMap;
};

/**
 * Lấy % giảm giá theo hạng VIP
 */
const getDiscountRateByTier = async (vipTier) => {
    if (!vipTier) return 0;
    const configMap = await getVipTierConfigMap();
    const tier = configMap[vipTier];
    return tier ? tier.discountRate : 0;
};

/**
 * Tính toán hạng VIP dựa trên tổng chi tiêu năm
 */
const calculateTierFromSpending = async (spendingAmount) => {
    const spending = Number(spendingAmount) || 0;
    const tiers = await getAllVipTiers();

    // Sắp xếp giảm dần theo minSpending để tìm hạng cao nhất đạt đủ điều kiện
    const sortedDesc = [...tiers].sort((a, b) => b.minSpending - a.minSpending);

    for (const tier of sortedDesc) {
        if (tier.minSpending > 0) {
            if (spending >= tier.minSpending) {
                return tier.key;
            }
        }
    }

    return 'none';
};

/**
 * Lấy thông tin mốc tiến trình lên hạng tiếp theo
 */
const getNextTierInfo = async (currentTier, yearlySpending) => {
    const spending = Number(yearlySpending) || 0;
    const tiers = await getAllVipTiers();

    const currentIdx = tiers.findIndex((t) => t.key === currentTier);
    if (currentIdx === -1 || currentIdx >= tiers.length - 1) {
        const topTier = tiers.length > 0 ? tiers[tiers.length - 1] : null;
        return {
            isMaxTier: true,
            nextTierName: null,
            nextTierThreshold: topTier ? topTier.minSpending : 100000000,
            remainingAmount: 0,
            progressPercent: 100,
        };
    }

    const nextTier = tiers[currentIdx + 1];
    const nextTierThreshold = nextTier.minSpending;

    const remainingAmount = Math.max(0, nextTierThreshold - spending);
    const progressPercent = Math.min(100, Math.round((spending / nextTierThreshold) * 100));

    return {
        isMaxTier: false,
        nextTierKey: nextTier.key,
        nextTierName: nextTier.name,
        nextTierThreshold,
        remainingAmount,
        progressPercent,
    };
};

/**
 * Admin: Thêm mới bậc hạng
 */
const createVipTier = async ({ name, minSpending, discountRate, color }) => {
    if (!name || typeof name !== 'string') {
        throw new Error('Tên bậc hạng không hợp lệ');
    }
    const key = slugifyKey(name);
    if (!key) {
        throw new Error('Tên bậc hạng phải chứa ít nhất 1 chữ cái hoặc chữ số');
    }

    const existingKey = await modelVipTier.findOne({ key });
    if (existingKey) {
        throw new Error(`Bậc hạng với key "${key}" đã tồn tại. Vui lòng chọn tên khác.`);
    }

    const tierCount = await modelVipTier.countDocuments();
    const newTier = await modelVipTier.create({
        key,
        name: name.trim(),
        minSpending: Number(minSpending) || 0,
        discountRate: Number(discountRate) || 0,
        color: color || '#8c8c8c',
        orderIndex: tierCount,
    });

    return newTier;
};

/**
 * Admin: Cập nhật bậc hạng (tên, minSpending, discountRate, color)
 * Nếu name thay đổi => Tự động cập nhật key tương ứng & đồng bộ User
 */
const updateVipTier = async (id, { name, minSpending, discountRate, color }) => {
    const tier = await modelVipTier.findById(id);
    if (!tier) {
        throw new Error('Không tìm thấy bậc hạng');
    }

    const oldKey = tier.key;
    let newKey = oldKey;

    if (name && name.trim() !== tier.name) {
        newKey = slugifyKey(name);
        if (!newKey) {
            throw new Error('Tên bậc hạng phải chứa ít nhất 1 chữ cái hoặc chữ số');
        }

        // Kiểm tra xem key mới có bị trùng với hạng khác không
        if (newKey !== oldKey) {
            const existingKey = await modelVipTier.findOne({ key: newKey, _id: { $ne: id } });
            if (existingKey) {
                throw new Error(`Bậc hạng với key "${newKey}" đã tồn tại. Vui lòng chọn tên khác.`);
            }
        }
    }

    tier.name = name ? name.trim() : tier.name;
    tier.key = newKey;
    if (minSpending !== undefined) tier.minSpending = Number(minSpending) || 0;
    if (discountRate !== undefined) tier.discountRate = Number(discountRate) || 0;
    if (color !== undefined) tier.color = color;

    await tier.save();

    // Nếu key thay đổi, tự động cập nhật vipTier cho tất cả User đang ở hạng cũ
    if (newKey !== oldKey) {
        await modelUser.updateMany({ vipTier: oldKey }, { vipTier: newKey });
    }

    return tier;
};

/**
 * Admin: Xóa bậc hạng
 */
const deleteVipTier = async (id) => {
    const tier = await modelVipTier.findById(id);
    if (!tier) {
        throw new Error('Không tìm thấy bậc hạng');
    }

    if (tier.key === 'none') {
        throw new Error('Không thể xóa hạng mặc định "Thành viên"');
    }

    await modelVipTier.deleteOne({ _id: id });
    // Chuyển người dùng ở hạng bị xóa về hạng 'none'
    await modelUser.updateMany({ vipTier: tier.key }, { vipTier: 'none' });

    return true;
};

/**
 * Tự động kiểm tra & reset năm tài chính nếu bước sang năm mới
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
 * Cập nhật tăng hạng khách hàng khi đơn hàng chuyển sang 'delivered'
 */
const updateCustomerTier = async (userId, orderId) => {
    if (!userId || !orderId || !mongoose.Types.ObjectId.isValid(userId)) return null;

    const order = await modelPayments.findById(orderId);
    if (!order) return null;

    if (order.tierCounted) {
        return null;
    }

    const user = await modelUser.findById(userId);
    if (!user) return null;

    await ensureCurrentYearUserTier(user);

    const orderAmount = Number(order.totalPrice) || 0;
    user.yearlySpending = Math.max(0, Number(user.yearlySpending || 0) + orderAmount);

    const newTier = await calculateTierFromSpending(user.yearlySpending);
    user.vipTier = newTier;
    await user.save();

    order.tierCounted = true;
    await order.save();

    return user;
};

/**
 * Trừ doanh số & hạ hạng khách hàng khi đơn bị hủy/hoàn tiền
 */
const revertCustomerTier = async (userId, orderId) => {
    if (!userId || !orderId || !mongoose.Types.ObjectId.isValid(userId)) return null;

    const order = await modelPayments.findById(orderId);
    if (!order) return null;

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
        order.tierCounted = false;
        await order.save();
        return user;
    }

    const orderAmount = Number(order.totalPrice) || 0;
    user.yearlySpending = Math.max(0, Number(user.yearlySpending || 0) - orderAmount);

    const newTier = await calculateTierFromSpending(user.yearlySpending);
    user.vipTier = newTier;
    await user.save();

    order.tierCounted = false;
    await order.save();

    return user;
};

module.exports = {
    slugifyKey,
    getAllVipTiers,
    getVipTierConfigMap,
    getDiscountRateByTier,
    calculateTierFromSpending,
    getNextTierInfo,
    createVipTier,
    updateVipTier,
    deleteVipTier,
    ensureCurrentYearUserTier,
    updateCustomerTier,
    revertCustomerTier,
};
