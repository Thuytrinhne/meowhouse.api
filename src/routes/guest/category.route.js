import express from "express";

import { getCategories, getCategoryById } from "../../controllers/guest/category.controller.js";

const router = express.Router();

router.get("/", getCategories);
router.get("/:categoryId", getCategoryById);

export default router;
