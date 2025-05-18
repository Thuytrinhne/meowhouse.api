import express from "express";
import {
  getPointSummary,
  getPointHistory,
  getCheckinStatus,
  checkin,
  redeemPoints,
} from "../../controllers/user/point.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

// Yêu cầu xác thực tất cả các route liên quan đến điểm
router.use(verifyToken);

// GET /points/summary - Tổng xu, xu khả dụng, sắp hết hạn
router.get("/summary", getPointSummary);

// GET /points/history - Lịch sử cộng/trừ xu
router.get("/history", getPointHistory);

// GET /points/checkin-status - Trạng thái chuỗi 7 ngày
router.get("/checkin/status", getCheckinStatus);

// POST /points/checkin - Nhận xu check-in hàng ngày
router.post("/checkin", checkin);

// POST /points/redeem - Sử dụng xu
router.post("/redeem", redeemPoints);

export default router;
