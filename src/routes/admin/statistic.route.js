import express from "express";
import {
  getDashboardSummary,
  getMonthlyRevenue,
  getQuarterlyOrderStats,
  getRevenueByCategory,
  getOrderSummary,
} from "../../controllers/admin/statistic.controller.js";

const router = express.Router();

// Static summary route
router.get("/dashboard-summary", getDashboardSummary);
router.get("/revenue-monthly", getMonthlyRevenue);
router.get("/quarterly-order-stats", getQuarterlyOrderStats);
router.get("/revenue-by-category", getRevenueByCategory);
router.get("/order-summary", getOrderSummary);

export default router;
