import express from "express";
import cartRouter from "./cart.route.js";
import couponRouter from "./coupon.route.js";

const router = express.Router();

router.use("/cart", cartRouter);
router.use("/coupons", couponRouter);

export default router;
