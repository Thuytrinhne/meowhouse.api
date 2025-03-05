import express from "express";

import {
  getArticles,
  getArticle,
  putArticle,
  postArticle,
  deleteArticle,
} from "../../controllers/admin/article.controller.js";

const router = express.Router();

router.get("/", getArticles);
router.get("/:id", getArticle);
router.post("/", postArticle);
router.put("/:id", putArticle);
router.delete("/", deleteArticle);

export default router;
