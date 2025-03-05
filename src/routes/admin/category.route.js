import express from "express";

import {
  getCategories,
  getCategory,
  postCategory,
  putCategory,
  deleteCategory,
} from "../../controllers/admin/category.controller.js";

const router = express.Router();

router.get("/", getCategories);
router.get("/:id", getCategory);
router.post("/", postCategory);
router.put("/:id", putCategory);
router.delete("/", deleteCategory);

export default router;
