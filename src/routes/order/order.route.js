import express from "express";
import multer from "multer";
import {
  getOrders,
  getOrderById,
  trackOrder,
  getOrderByOrderId,
  cancelOrder,
  getOrderByHashedId,
  addProductRatingWithMedia,
  getOrderRatings,
} from "../../controllers/user/order.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();
const upload = multer();

// Route không cần xác thực
router.get("/track", trackOrder);
router.get("/getOrder/:orderId", getOrderByOrderId);
router.put("/cancel/:orderId", cancelOrder);

// Các routes khác cần xác thực token
router.use(verifyToken);
router.get("/", getOrders);
router.get("/:id", getOrderById);
router.get("/rating/:hashedId", getOrderByHashedId);
router.post(
  "/rating/:pid/:productId",
  (req, res, next) => {
    upload.fields([
      { name: "images", maxCount: 5 },
      { name: "videos", maxCount: 2 },
    ])(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: err.message });
      } else if (err) {
        return res.status(500).json({ success: false, message: "File upload error" });
      }
      next();
    });
  },
  addProductRatingWithMedia
);
router.get("/rating/getContent/:hashedId", getOrderRatings);

export default router;
