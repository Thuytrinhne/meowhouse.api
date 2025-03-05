import express from "express";
import {
  getProduct,
  getRecommend,
  getProducts,
} from "../../controllers/guest/product.controller.js";

const router = express.Router();

router.get("/", getProducts);
router.get("/:pid", getProduct);
router.get("/getRecommend/:pid", getRecommend);

export default router;
