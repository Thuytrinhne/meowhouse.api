import express from "express";
import productRouter from "./product.route.js";
import userRouter from "./user.route.js";
import couponRouter from "./coupon.route.js";
import groupsRouter from "./group.route.js";
import categoryRouter from "./category.route.js";
import articleRouter from "./article.route.js";
import notificationRouter from "./notification.router.js";

const router = express.Router();

router.use("/products", productRouter);
router.use("/users", userRouter);
router.use("/coupons", couponRouter);
router.use("/groups", groupsRouter);
router.use("/categories", categoryRouter);
router.use("/articles", articleRouter);
router.use("/notifications", notificationRouter);

export default router;
