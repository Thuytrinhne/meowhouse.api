import Order from "../../models/order.model.js";
import User from "../../models/user.model.js";
import Product from "../../models/product.model.js";
import Category from "../../models/category.model.js";
import { ok, error } from "../../handlers/respone.handler.js";

export const getDashboardSummary = async (req, res) => {
  try {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1); // Thời gian bắt đầu và kết thúc của hôm nay (UTC)

    const startOfToday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const endOfToday = new Date(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + 1)
    ); // Doanh thu trong tháng

    const revenueResult = await Order.aggregate([
      {
        $match: {
          order_status: "delivered",
          createdAt: { $gte: firstDayOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$final_cost" },
        },
      },
    ]);
    const totalRevenue = revenueResult[0]?.totalRevenue || 0; // Doanh thu hôm nay

    const revenueTodayResult = await Order.aggregate([
      {
        $match: {
          order_status: "delivered",
          createdAt: {
            $gte: startOfToday,
            $lt: endOfToday,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenueToday: { $sum: "$final_cost" },
        },
      },
    ]);
    const totalRevenueToday = revenueTodayResult[0]?.totalRevenueToday || 0; // Đăng ký mới trong ngày hôm nay

    const totalNewCustomers = await User.countDocuments({
      createdAt: { $gte: startOfToday, $lt: endOfToday },
    }); // Đơn hàng mới trong ngày hôm nay

    const totalNewOrders = await Order.countDocuments({
      createdAt: { $gte: startOfToday, $lt: endOfToday },
    }); // Đánh giá mới trong ngày hôm nay

    const ratingTodayResult = await Product.aggregate([
      { $unwind: "$recent_reviews" },
      {
        $match: {
          "recent_reviews.review_date": {
            $gte: startOfToday,
            $lt: endOfToday,
          },
        },
      },
      {
        $count: "totalNewRatingToday",
      },
    ]);
    const totalNewRating = ratingTodayResult[0]?.totalNewRatingToday || 0;
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 1); // tức là đầu tháng này

    const lastMonthRevenueResult = await Order.aggregate([
      {
        $match: {
          order_status: "delivered",
          createdAt: {
            $gte: lastMonth,
            $lt: endOfLastMonth,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$final_cost" },
        },
      },
    ]);
    const lastMonthRevenue = lastMonthRevenueResult[0]?.total || 0;

    // Tính phần trăm thay đổi
    let revenueGrowthRate = 0;
    if (lastMonthRevenue > 0) {
      revenueGrowthRate = ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    } else if (totalRevenue > 0) {
      revenueGrowthRate = 100;
    } // nếu tháng trước không có đơn, coi như tăng 100%

    return ok(res, {
      summaryData: {
        totalRevenue,
        totalRevenueToday,
        totalNewCustomers,
        totalNewOrders,
        totalNewRating,
        revenueGrowthRate: parseFloat(revenueGrowthRate.toFixed(1)), // làm tròn 1 chữ số thập phân
      },
    });
  } catch (err) {
    console.error("Error in getDashboardSummary:", err);
    return error(res, "Internal server error");
  }
};

export const getMonthlyRevenue = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    const revenuePerMonth = await Order.aggregate([
      {
        $match: {
          order_status: "delivered",
          createdAt: {
            $gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
            $lt: new Date(`${currentYear + 1}-01-01T00:00:00.000Z`),
          },
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" }, // Lấy tháng từ createdAt
          totalRevenue: { $sum: "$final_cost" },
        },
      },
      {
        $project: {
          _id: 0,
          month: "$_id",
          revenue: "$totalRevenue",
        },
      },
      {
        $sort: { month: 1 }, // Sắp xếp theo tháng tăng dần
      },
    ]);

    // Danh sách tháng cố định (tháng nào không có đơn hàng sẽ mặc định 0)
    const fullRevenue = Array.from({ length: 12 }, (_, i) => {
      const monthData = revenuePerMonth.find((item) => item.month === i + 1);
      return {
        month: `Tháng ${i + 1}`,
        revenue: monthData ? monthData.revenue : 0,
      };
    });

    return ok(res, {
      revenueData: fullRevenue,
    });
  } catch (err) {
    console.error("Error in getMonthlyRevenue:", err);
    return error(res, "Internal server error");
  }
};

export const getQuarterlyOrderStats = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear(); // Tạo mảng 4 quý

    const quarters = [
      { label: "Quý 1 (T1 → T3)", start: 1, end: 3 },
      { label: "Quý 2 (T4 → T6)", start: 4, end: 6 },
      { label: "Quý 3 (T7 → T9)", start: 7, end: 9 },
      { label: "Quý 4 (T10 → T12)", start: 10, end: 12 },
    ];

    const result = [];

    for (const q of quarters) {
      const startDate = new Date(currentYear, q.start - 1, 1);
      const endDate = new Date(currentYear, q.end, 1); // đầu tháng sau quý

      const orders = await Order.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lt: endDate,
            },
          },
        },
        {
          $group: {
            _id: "$order_status",
            count: { $sum: 1 },
          },
        },
      ]);

      const summary = {
        quarter: q.label,
        newOrders: 0,
        paidOrders: 0,
        canceledOrders: 0,
      };

      for (const item of orders) {
        if (item._id === "unpaid") summary.newOrders += item.count;
        if (item._id === "delivered") summary.paidOrders += item.count;
        if (item._id === "canceled") summary.canceledOrders += item.count;
      }

      result.push(summary);
    }

    return ok(res, result);
  } catch (err) {
    console.error("Error in getQuarterlyOrderStats:", err);
    return error(res, "Internal server error");
  }
};

export const getRevenueByCategory = async (req, res) => {
  try {
    const orders = await Order.find({ order_status: "delivered" }).select("order_products");

    const productRevenueMap = new Map();

    for (const order of orders) {
      for (const item of order.order_products) {
        const revenue = item.unit_price * (1 - item.discount_percent / 100) * item.quantity;
        const prev = productRevenueMap.get(item.product_id.toString()) || 0;
        productRevenueMap.set(item.product_id.toString(), prev + revenue);
      }
    }

    const productIds = Array.from(productRevenueMap.keys());
    const products = await Product.find({ _id: { $in: productIds } }).select("category_id");

    const categoryRevenueMap = new Map();

    for (const product of products) {
      const revenue = productRevenueMap.get(product._id.toString()) || 0;
      const categoryId = product.category_id?.toString() || "Khác";
      const prev = categoryRevenueMap.get(categoryId) || 0;
      categoryRevenueMap.set(categoryId, prev + revenue);
    }

    const totalRevenue = Array.from(categoryRevenueMap.values()).reduce((a, b) => a + b, 0);

    const categoryIds = Array.from(categoryRevenueMap.keys()).filter((id) => id !== "Khác");
    const categoryDocs = await Category.find({ _id: { $in: categoryIds } }).select("category_name");
    const categoryNameMap = new Map(categoryDocs.map((c) => [c._id.toString(), c.category_name]));

    let rawData = Array.from(categoryRevenueMap.entries()).map(([categoryId, revenue]) => ({
      category: categoryId === "Khác" ? "Khác" : categoryNameMap.get(categoryId) || "Không rõ",
      revenue,
      percent: totalRevenue ? parseFloat(((revenue / totalRevenue) * 100).toFixed(1)) : 0,
    })); // Sắp xếp giảm dần theo doanh thu

    rawData.sort((a, b) => b.percent - a.percent); // Nếu nhiều hơn 5 mục, giữ 4 mục đầu và gộp phần còn lại thành "Others"

    const MAX_ITEMS = 5;
    if (rawData.length > MAX_ITEMS) {
      const topItems = rawData.slice(0, MAX_ITEMS - 1); // giữ 4 mục đầu
      const others = rawData.slice(MAX_ITEMS - 1);
      const othersTotal = others.reduce((sum, item) => sum + item.percent, 0);

      topItems.push({
        category: "Others",
        percent: parseFloat(othersTotal.toFixed(1)),
      });

      rawData = topItems;
    } // Gán màu từ 1 đến 5

    const revenueData = rawData.map((item, index) => ({
      category: item.category,
      percent: item.percent,
      fill: `var(--color-category${index + 1})`,
    }));

    return ok(res, revenueData);
  } catch (err) {
    console.error("Error in getRevenueByCategory:", err);
    return error(res, "Internal server error");
  }
};

export const getOrderSummary = async (req, res) => {
  try {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999); // 1. Total new orders this month & last month

    const [thisMonthOrders, lastMonthOrders] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: thisMonthStart } }),
      Order.countDocuments({ createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } }),
    ]); // 2. Total pending orders (status = unpaid or delivering)

    const totalPendingOrders = await Order.countDocuments({
      order_status: { $in: ["unpaid", "delivering"] },
    }); // 3. Total products sold & volume (only from delivered orders)

    const deliveredOrders = await Order.find({ order_status: "delivered" }).select(
      "order_products createdAt"
    );

    let thisMonthProductSales = 0;
    let lastMonthProductSales = 0;
    let thisMonthVolume = 0;
    let lastMonthVolume = 0;

    for (const order of deliveredOrders) {
      const orderMonth = order.createdAt.getMonth();
      const orderYear = order.createdAt.getFullYear();

      for (const item of order.order_products) {
        const quantity = item.quantity;
        const price = item.unit_price * (1 - item.discount_percent / 100);
        const volume = quantity * price;

        if (order.createdAt >= thisMonthStart) {
          thisMonthProductSales += quantity;
          thisMonthVolume += volume;
        } else if (order.createdAt >= lastMonthStart && order.createdAt <= lastMonthEnd) {
          lastMonthProductSales += quantity;
          lastMonthVolume += volume;
        }
      }
    } // Helper to calculate percent change

    const calcPercent = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return res.status(200).json({
      success: true,
      data: {
        totalNewOrders: {
          value: thisMonthOrders,
          percent: calcPercent(thisMonthOrders, lastMonthOrders),
        },
        totalOrdersPending: {
          value: totalPendingOrders,
          percent: -10, // Optional: You may not want to calculate this every time
        },
        totalProductsSales: {
          value: thisMonthProductSales,
          percent: calcPercent(thisMonthProductSales, lastMonthProductSales),
        },
        totalVolumeOfProducts: {
          value: Math.round(thisMonthVolume),
          percent: calcPercent(thisMonthVolume, lastMonthVolume),
        },
      },
    });
  } catch (err) {
    console.error("Error in getDashboardSummary:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
