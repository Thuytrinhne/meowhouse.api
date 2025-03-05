import express from "express";

import {
  getCoupons,
  getCoupon,
  putCoupon,
  postCoupon,
  deleteCoupon,
} from "../../controllers/admin/coupon.controller.js";

const router = express.Router();

router.get("/", getCoupons);
router.get("/:id", getCoupon);
router.post("/", postCoupon);
router.put("/:id", putCoupon);
router.delete("/", deleteCoupon);

export default router;
