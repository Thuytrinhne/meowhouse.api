import express from "express";

import { getOrders } from "../../controllers/admin/order.controller.js";

const router = express.Router();

router.get("/", getOrders);

export default router;
