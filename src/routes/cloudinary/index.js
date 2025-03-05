import express from "express";
import multer from "multer";

import { deleteImages, uploadImages } from "../../controllers/general/cloudinary.controller.js";

const router = express.Router();

// Cấu hình Multer để sử dụng bộ nhớ
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/", upload.array("file"), uploadImages);
router.delete("/", deleteImages);

export default router;
