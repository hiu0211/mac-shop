const modelPayments = require("../models/payments.model");
const modelProduct = require("../models/products.model");

const { BadRequestError } = require("../core/error.response");
const { OK } = require("../core/success.response");

const MAX_DATE_RANGE_DAYS = 366;

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

    const startDateObj = new Date(`${start_date}T00:00:00.000Z`);
    const endDateObj = new Date(`${end_date}T23:59:59.999Z`);

    if (endDateObj < startDateObj) {
      throw new BadRequestError("Ngày kết thúc phải sau ngày bắt đầu");
    }

    const diffDays = Math.floor((endDateObj - startDateObj) / 86400000);
    if (diffDays > MAX_DATE_RANGE_DAYS) {
      throw new BadRequestError("Khoảng thời gian tối đa là 1 năm");
    }

    // Assumption: date filtering is evaluated in UTC by using Z-suffixed boundaries.
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
    const productQuantityMap = new Map();

    for (const order of orders) {
      const orderTotalPrice = Number(order.totalPrice) || 0;
      const orderDiscount = Number(order.discountAmount) || 0;
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
      for (const item of orderProducts) {
        const productId = item?.productId;
        const quantity = Number(item?.quantity) || 0;

        if (!productId || quantity <= 0) {
          continue;
        }

        const productKey = productId.toString();
        const currentQuantity = productQuantityMap.get(productKey) || 0;
        productQuantityMap.set(productKey, currentQuantity + quantity);

        summary.total_items_sold += quantity;
      }
    }

    summary.average_order_value =
      summary.total_orders > 0
        ? Math.round(summary.total_revenue / summary.total_orders)
        : 0;

    const productIds = [...productQuantityMap.keys()];
    const productDocs =
      productIds.length > 0
        ? await modelProduct
            .find({ _id: { $in: productIds } })
            .select("_id name images brand price costPrice")
            .lean()
        : [];

    const productMap = new Map(
      productDocs.map((product) => [product._id.toString(), product])
    );

    let costOfGoods = 0;

    // Duyet lai product quantity map de tinh chi phi hang ban (COGS).
    for (const [productId, quantity] of productQuantityMap.entries()) {
      const product = productMap.get(productId);
      const costPrice = Number(product?.costPrice) || 0;
      costOfGoods += costPrice * quantity;
    }

    const grossProfit = summary.total_revenue - costOfGoods;
    const profitMargin =
      summary.total_revenue > 0
        ? Math.round((grossProfit / summary.total_revenue) * 10000) / 100
        : 0;

    summary.cost_of_goods = costOfGoods;
    summary.gross_profit = grossProfit;
    summary.profit_margin = profitMargin;

    // Sau khi co product map, tinh chi phi theo tung ky de suy ra loi nhuan chart.
    for (const order of orders) {
      const createdAt = new Date(order.createdAt);
      const { period } = buildPeriodInfo(createdAt, groupBy);
      const point = chartMap.get(period);

      if (!point) {
        continue;
      }

      const orderProducts = Array.isArray(order.products) ? order.products : [];
      for (const item of orderProducts) {
        const productId = item?.productId?.toString();
        const quantity = Number(item?.quantity) || 0;

        if (!productId || quantity <= 0) {
          continue;
        }

        const product = productMap.get(productId);
        const costPrice = Number(product?.costPrice) || 0;
        point.cost = (point.cost || 0) + costPrice * quantity;
      }
    }

    const chartData = [...chartMap.values()]
      .sort((a, b) => a.sortValue - b.sortValue)
      .map(({ period, revenue, orders: orderCount, cost }) => ({
        period,
        revenue,
        orders: orderCount,
        profit: revenue - (cost || 0),
      }));

    const topProducts = productIds
      .map((productId) => {
        const product = productMap.get(productId);
        const quantitySold = productQuantityMap.get(productId) || 0;
        const unitPrice = Number(product?.price) || 0;
        const costPrice = Number(product?.costPrice) || 0;
        const revenue = quantitySold * unitPrice;

        return {
          product_id: productId,
          product_name: product?.name || "Sản phẩm không tồn tại",
          product_image: Array.isArray(product?.images) ? product.images[0] || "" : "",
          brand: product?.brand || "",
          quantity_sold: quantitySold,
          revenue,
          cost_price: costPrice,
          profit: revenue - costPrice * quantitySold,
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
      },
    }).send(res);
  }
}

module.exports = new RevenueController();
