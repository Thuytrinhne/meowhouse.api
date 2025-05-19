import express from "express";
import { getRewards } from "../../controllers/user/reward.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

// Yêu cầu xác thực tất cả các route liên quan đến điểm
router.use(verifyToken);

// GET /rewards/summary - Tổng xu, xu khả dụng, sắp hết hạn
router.get("/", getRewards);

export default router;
