const modelPayments = require("../models/payments.model");
const modelProduct = require("../models/products.model");
const modelUser = require("../models/users.model");

const { BadRequestError } = require("../core/error.response");
const { OK } = require("../core/success.response");

const MAX_DATE_RANGE_DAYS = 366 * 5;

const normalizeColorKey = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase();

const toNonNegativeNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return fallback;
  }
  return numericValue;
};

const normalizeProductColorOptions = (colorOptions = []) => {
  if (!Array.isArray(colorOptions)) {
    return [];
  }

  return colorOptions
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      key: normalizeColorKey(item.key || ""),
      name: String(item.name || "").trim(),
      image: String(item.image || "").trim(),
      price: toNonNegativeNumber(item.price, -1),
    }))
    .filter((item) => item.key && item.name);
};

const resolveFallbackProductImage = (product = null) => {
  if (!Array.isArray(product?.images)) {
    return "";
  }

  return product.images.map((item) => String(item || "").trim()).find(Boolean) || "";
};

const resolveOrderItemUnitPrice = ({ orderItem = {}, product = null }) => {
  const snapshotUnitPrice = toNonNegativeNumber(orderItem?.unitPrice, -1);
  if (snapshotUnitPrice >= 0) {
    return snapshotUnitPrice;
  }

  const snapshotPrice = toNonNegativeNumber(orderItem?.price, -1);
  if (snapshotPrice >= 0) {
    return snapshotPrice;
  }

  const selectedColorKey = normalizeColorKey(orderItem?.selectedColorKey);
  const normalizedColorOptions = normalizeProductColorOptions(product?.colorOptions);
  if (selectedColorKey && normalizedColorOptions.length > 0) {
    const matchedColor = normalizedColorOptions.find((item) => item.key === selectedColorKey);
    if (matchedColor && matchedColor.price >= 0) {
      return matchedColor.price;
    }
  }

  return toNonNegativeNumber(product?.price, 0);
};

const resolveOrderItemColorInfo = ({ orderItem = {}, product = null }) => {
  const selectedColorKey = normalizeColorKey(orderItem?.selectedColorKey);
  const selectedColorName = String(orderItem?.selectedColorName || "").trim();
  const selectedColorImage = String(orderItem?.selectedColorImage || "").trim();

  const normalizedColorOptions = normalizeProductColorOptions(product?.colorOptions);
  const matchedColor =
    selectedColorKey && normalizedColorOptions.length > 0
      ? normalizedColorOptions.find((item) => item.key === selectedColorKey)
      : null;

  return {
    colorKey: selectedColorKey || normalizeColorKey(matchedColor?.key) || "default",
    colorName: selectedColorName || matchedColor?.name || "Mặc định",
    colorImage: selectedColorImage || String(matchedColor?.image || "").trim() || resolveFallbackProductImage(product),
  };
};

const isValidDateString = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
};

const getIsoWeekInfo = (dateInput) => {
  const date = new Date(
    Date.UTC(
      dateInput.getUTCFullYear(),
      dateInput.getUTCMonth(),
      dateInput.getUTCDate()
    )
  );

  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);

  const weekYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);

  return {
    weekYear,
    week,
  };
};

const buildPeriodInfo = (dateInput, groupBy) => {
  const year = dateInput.getUTCFullYear();
  const month = String(dateInput.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dateInput.getUTCDate()).padStart(2, "0");

  if (groupBy === "month") {
    return {
      period: `${year}-${month}`,
      sortValue: Date.UTC(year, dateInput.getUTCMonth(), 1),
    };
  }

  if (groupBy === "week") {
    const { weekYear, week } = getIsoWeekInfo(dateInput);
    return {
      period: `${weekYear}-W${String(week).padStart(2, "0")}`,
      sortValue: weekYear * 100 + week,
    };
  }

  return {
    period: `${year}-${month}-${day}`,
    sortValue: Date.UTC(year, dateInput.getUTCMonth(), dateInput.getUTCDate()),
  };
};

class RevenueController {
  async getRevenueStatistics(req, res) {
    const { start_date, end_date } = req.query;
    const groupBy = req.query.group_by || "day";

    if (!start_date || !end_date) {
      throw new BadRequestError("Vui lòng chọn khoảng thời gian");
    }

    if (!isValidDateString(start_date) || !isValidDateString(end_date)) {
      throw new BadRequestError("Định dạng ngày không hợp lệ");
    }

    if (!["day", "week", "month"].includes(groupBy)) {
      throw new BadRequestError("Giá trị group_by không hợp lệ");
    }

    const parseStartOfDayLocal = (dateStr) => {
      const [year, month, day] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day, 0, 0, 0, 0);
    };

    const parseEndOfDayLocal = (dateStr) => {
      const [year, month, day] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day, 23, 59, 59, 999);
    };

    const startDateObj = parseStartOfDayLocal(start_date);
    const endDateObj = parseEndOfDayLocal(end_date);

    if (endDateObj < startDateObj) {
      throw new BadRequestError("Ngày kết thúc phải sau ngày bắt đầu");
    }

    const diffDays = Math.floor((endDateObj - startDateObj) / 86400000);
    if (diffDays > MAX_DATE_RANGE_DAYS) {
      throw new BadRequestError("Khoảng thời gian tối đa là 5 năm");
    }

    const orders = await modelPayments
      .find({
        statusOrder: "delivered",
        createdAt: { $gte: startDateObj, $lte: endDateObj },
      })
      .lean();

    const summary = {
      total_revenue: 0,
      total_orders: orders.length,
      total_items_sold: 0,
      total_discount: 0,
      average_order_value: 0,
      revenue_cod: 0,
      revenue_vnpay: 0,
      cost_of_goods: 0,
      gross_profit: 0,
      profit_margin: 0,
    };

    const chartMap = new Map();
    const productIdSet = new Set();
    const customerRevenueMap = new Map();

    for (const order of orders) {
      const orderTotalPrice = toNonNegativeNumber(order.totalPrice, 0);
      const orderDiscount = toNonNegativeNumber(order.discountAmount, 0);
      const paymentType = order.typePayments;

      summary.total_revenue += orderTotalPrice;
      summary.total_discount += orderDiscount;

      if (paymentType === "COD") {
        summary.revenue_cod += orderTotalPrice;
      }
      if (paymentType === "VNPAY") {
        summary.revenue_vnpay += orderTotalPrice;
      }

      const createdAt = new Date(order.createdAt);
      const { period, sortValue } = buildPeriodInfo(createdAt, groupBy);

      if (!chartMap.has(period)) {
        chartMap.set(period, { period, revenue: 0, orders: 0, sortValue });
      }

      const currentPoint = chartMap.get(period);
      currentPoint.revenue += orderTotalPrice;
      currentPoint.orders += 1;

      const orderProducts = Array.isArray(order.products) ? order.products : [];
      let orderItemsSold = 0;

      for (const item of orderProducts) {
        const productId = String(item?.productId || "").trim();
        const quantity = Number(item?.quantity) || 0;

        if (!productId || quantity <= 0) {
          continue;
        }

        productIdSet.add(productId);
        orderItemsSold += quantity;
        summary.total_items_sold += quantity;
      }

      const customerId = String(order?.userId || "").trim();
      if (customerId) {
        const currentCustomer = customerRevenueMap.get(customerId) || {
          customer_id: customerId,
          customer_name: String(order?.fullName || "").trim(),
          customer_phone: String(order?.phone || "").trim(),
          order_count: 0,
          items_sold: 0,
          revenue: 0,
        };

        currentCustomer.order_count += 1;
        currentCustomer.items_sold += orderItemsSold;
        currentCustomer.revenue += orderTotalPrice;

        if (!currentCustomer.customer_name) {
          currentCustomer.customer_name = String(order?.fullName || "").trim();
        }
        if (!currentCustomer.customer_phone) {
          currentCustomer.customer_phone = String(order?.phone || "").trim();
        }

        customerRevenueMap.set(customerId, currentCustomer);
      }
    }

    summary.average_order_value =
      summary.total_orders > 0
        ? Math.round(summary.total_revenue / summary.total_orders)
        : 0;

    const productIds = [...productIdSet];
    const productDocs =
      productIds.length > 0
        ? await modelProduct
            .find({ _id: { $in: productIds } })
            .select("_id name images brand price costPrice colorOptions")
            .lean()
        : [];

    const productMap = new Map(
      productDocs.map((product) => [product._id.toString(), product])
    );

    let costOfGoods = 0;
    const productRevenueMap = new Map();

    // Tinh doanh thu theo tung dong san pham (line item) de dam bao dung gia theo mau.
    // Neu don hang co giam gia, doanh thu dong duoc phan bo theo ti le line gross.
    for (const order of orders) {
      const createdAt = new Date(order.createdAt);
      const { period } = buildPeriodInfo(createdAt, groupBy);
      const point = chartMap.get(period);

      if (!point) {
        continue;
      }

      const orderProducts = Array.isArray(order.products) ? order.products : [];
      const resolvedLines = [];

      for (const item of orderProducts) {
        const productId = String(item?.productId || "").trim();
        const quantity = Number(item?.quantity) || 0;

        if (!productId || quantity <= 0) {
          continue;
        }

        const product = productMap.get(productId) || null;
        const unitPrice = resolveOrderItemUnitPrice({ orderItem: item, product });
        const grossRevenue = unitPrice * quantity;
        const costPrice = toNonNegativeNumber(product?.costPrice, 0);
        const { colorKey, colorName, colorImage } = resolveOrderItemColorInfo({
          orderItem: item,
          product,
        });

        resolvedLines.push({
          productId,
          quantity,
          unitPrice,
          grossRevenue,
          costPrice,
          colorKey,
          colorName,
          colorImage,
        });
      }

      const grossOrderRevenue = resolvedLines.reduce(
        (sum, line) => sum + line.grossRevenue,
        0
      );
      const totalLineQuantity = resolvedLines.reduce(
        (sum, line) => sum + line.quantity,
        0
      );
      const orderNetRevenue = toNonNegativeNumber(order.totalPrice, 0);

      for (const line of resolvedLines) {
        let lineRevenue = 0;

        if (grossOrderRevenue > 0) {
          lineRevenue = line.grossRevenue * (orderNetRevenue / grossOrderRevenue);
        } else if (totalLineQuantity > 0) {
          lineRevenue = orderNetRevenue * (line.quantity / totalLineQuantity);
        }

        const lineCost = line.costPrice * line.quantity;
        costOfGoods += lineCost;
        point.cost = (point.cost || 0) + lineCost;

        if (!productRevenueMap.has(line.productId)) {
          const product = productMap.get(line.productId);

          productRevenueMap.set(line.productId, {
            product_id: line.productId,
            product_name: product?.name || "Sản phẩm không tồn tại",
            product_image: resolveFallbackProductImage(product),
            brand: product?.brand || "",
            quantity_sold: 0,
            revenue: 0,
            cost_amount: 0,
            color_breakdown: new Map(),
          });
        }

        const productEntry = productRevenueMap.get(line.productId);
        productEntry.quantity_sold += line.quantity;
        productEntry.revenue += lineRevenue;
        productEntry.cost_amount += lineCost;

        const colorBucket = productEntry.color_breakdown.get(line.colorKey) || {
          color_key: line.colorKey,
          color_name: line.colorName,
          color_image: line.colorImage,
          quantity_sold: 0,
          revenue: 0,
        };

        colorBucket.quantity_sold += line.quantity;
        colorBucket.revenue += lineRevenue;

        if (!colorBucket.color_name && line.colorName) {
          colorBucket.color_name = line.colorName;
        }
        if (!colorBucket.color_image && line.colorImage) {
          colorBucket.color_image = line.colorImage;
        }

        productEntry.color_breakdown.set(line.colorKey, colorBucket);
      }
    }

    const grossProfit = summary.total_revenue - costOfGoods;
    const profitMargin =
      summary.total_revenue > 0
        ? Math.round((grossProfit / summary.total_revenue) * 10000) / 100
        : 0;

    summary.cost_of_goods = costOfGoods;
    summary.gross_profit = grossProfit;
    summary.profit_margin = profitMargin;

    const chartData = [...chartMap.values()]
      .sort((a, b) => a.sortValue - b.sortValue)
      .map(({ period, revenue, orders: orderCount, cost }) => ({
        period,
        revenue,
        orders: orderCount,
        profit: revenue - (cost || 0),
      }));

    const topProducts = [...productRevenueMap.values()]
      .map((item) => {
        const colorBreakdown = [...item.color_breakdown.values()]
          .sort((a, b) => b.revenue - a.revenue)
          .map((colorItem) => ({
            ...colorItem,
            revenue: Math.round(colorItem.revenue),
          }));

        const bestColor = colorBreakdown[0] || null;
        const averageUnitPrice =
          item.quantity_sold > 0
            ? Math.round(item.revenue / item.quantity_sold)
            : 0;

        return {
          product_id: item.product_id,
          product_name: item.product_name,
          product_image: item.product_image,
          brand: item.brand,
          quantity_sold: item.quantity_sold,
          average_unit_price: averageUnitPrice,
          revenue: Math.round(item.revenue),
          profit: Math.round(item.revenue - item.cost_amount),
          best_color_key: bestColor?.color_key || "",
          best_color_name: bestColor?.color_name || "",
          best_color_image: bestColor?.color_image || "",
          color_breakdown: colorBreakdown.slice(0, 3),
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const customerIds = [...customerRevenueMap.keys()];
    const customerDocs =
      customerIds.length > 0
        ? await modelUser
            .find({ _id: { $in: customerIds } })
            .select("_id fullName email phone")
            .lean()
        : [];

    const customerMap = new Map(
      customerDocs.map((item) => [item._id.toString(), item])
    );

    const topCustomers = [...customerRevenueMap.values()]
      .map((item) => {
        const customerProfile = customerMap.get(item.customer_id);
        const revenue = Math.round(item.revenue);
        const orderCount = Number(item.order_count) || 0;

        return {
          customer_id: item.customer_id,
          customer_name:
            String(customerProfile?.fullName || "").trim() ||
            item.customer_name ||
            "Khách hàng",
          customer_email: String(customerProfile?.email || "").trim(),
          customer_phone:
            String(customerProfile?.phone || "").trim() || item.customer_phone || "",
          order_count: orderCount,
          items_sold: Number(item.items_sold) || 0,
          revenue,
          average_order_value:
            orderCount > 0 ? Math.round(revenue / orderCount) : 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    new OK({
      message: "Lấy thống kê doanh thu thành công",
      metadata: {
        summary,
        chart_data: chartData,
        top_products: topProducts,
        top_customers: topCustomers,
      },
    }).send(res);
  }
}

module.exports = new RevenueController();
