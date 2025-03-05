import express from "express";

import {
  getAllArticles,
  getPaginatedArticles,
  getOneArticle,
} from "../../controllers/guest/article.controller.js";

const router = express.Router();

router.get("/all", getAllArticles);
router.get("/", getPaginatedArticles);
router.get("/:slug/:aid", getOneArticle);

export default router;
