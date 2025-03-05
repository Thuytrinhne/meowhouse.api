import express from "express";
import multer from "multer";
import { getProfile, updateProfile } from "../../controllers/user/user.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import {
  addAddress,
  deleteAddress,
  updateAddress,
  getAddressesByUserId,
  getAddressesById,
} from "../../controllers/user/address.controller.js";

const router = express.Router();

// Cấu hình multer để xử lý file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Chỉ chấp nhận file ảnh
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// All routes require authentication
router.use(verifyToken);

router.get("/profile", getProfile);
router.put("/profile", upload.single("user_avt"), updateProfile);
router.post("/:user_id/addresses", addAddress); // Thêm địa chỉ
router.delete("/addresses/:id", deleteAddress); // Xóa địa chỉ
router.put("/addresses/:id", updateAddress); // Sửa địa chỉ
router.get("/:user_id/addresses", getAddressesByUserId); // Lấy địa chỉ theo user_id
router.get("/addresses/:id", getAddressesById); // Lấy địa chỉ theo địa chỉ id

export default router;
