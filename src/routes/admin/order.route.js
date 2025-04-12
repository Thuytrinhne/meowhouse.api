import express from "express";

import {
  getOrders,
  getOrderById,
  updateOrderStatus,
} from "../../controllers/admin/order.controller.js";

const router = express.Router();

router.get("/", getOrders);
router.get("/:id", getOrderById);
router.put("/:id/status", updateOrderStatus);

export default router;
