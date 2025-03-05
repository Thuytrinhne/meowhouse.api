import express from "express";

import {
  addCoupon,
  getCoupons,
  getUserCoupons,
} from "../../controllers/customer/coupon.controller.js";

const router = express.Router();

router.get("/", getCoupons);
router.get("/:userId", getUserCoupons);
router.post("/:userId", addCoupon);

export default router;
