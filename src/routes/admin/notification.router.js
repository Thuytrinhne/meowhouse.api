import express from "express";
import {
  getNotifications,
  getNotification,
  createNotification,
  updateNotification,
  deleteNotifications,
} from "../../controllers/admin/notification.controller.js";

const router = express.Router();

// [GET] Lấy danh sách thông báo
router.get("/", getNotifications);

// [GET] Lấy thông báo theo ID
router.get("/:id", getNotification);

// [POST] Tạo thông báo mới
router.post("/", createNotification);

// [PUT] Cập nhật thông báo
router.put("/:id", updateNotification);

// [DELETE] Xóa nhiều thông báo
router.delete("/", deleteNotifications);

export default router;
