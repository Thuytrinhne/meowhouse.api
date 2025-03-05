import express from "express";

import {
  getProducts,
  getProduct,
  putProduct,
  postProduct,
  deleteProduct,
} from "../../controllers/admin/product.controller.js";

const router = express.Router();

router.get("/", getProducts);
router.get("/:id", getProduct);
router.post("/", postProduct);
router.put("/:id", putProduct);
router.delete("/", deleteProduct);

export default router;
