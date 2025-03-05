import mongoose from "mongoose";

import Article from "../../models/article.model.js";
import { notFound, ok, error, badRequest, created } from "../../handlers/respone.handler.js";
import { createSlug } from "../../utils/functions/format.js";

// [GET] /api/admin/articles
export const getArticles = async (req, res, next) => {
  try {
    const articles = await Article.aggregate([
      {
        $match: {},
      },
      {
        $project: {
          user_id: 0,
          article_slug: 0,
          article_short_description: 0,
          article_content: 0,
          article_references: 0,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    // console.log("articles: ", articles);

    if (!articles.length) return notFound(res, {});

    return ok(res, { articles: articles });
  } catch (err) {
    console.log("Err: " + err);
    return error(res, err.message);
  }
};

// [GET] /api/admin/articles/{id}
export const getArticle = async (req, res, next) => {
  try {
    const id = req.params.id;
    const objectId = new mongoose.Types.ObjectId(id);
    const articles = await Article.aggregate([
      {
        $match: { _id: objectId },
      },
    ]);

    // console.log("articles: ", articles);

    if (!articles.length) return notFound(res, {});

    return ok(res, { article: articles[0] });
  } catch (err) {
    console.log("Err: " + err);
    return error(res, err.message);
  }
};

// [POST] /api/admin/articles
export const postArticle = async (req, res, next) => {
  try {
    const article = req.body;

    const addArticle = {
      ...article,
      article_slug: createSlug(article.article_name),
    };

    // console.log("aaaaaaaaaaaa", addArticle);

    const newAricle = new Article(addArticle);

    const savedArticle = newAricle.save();

    if (!savedArticle) return badRequest(res, {});
    return created(res, { id: savedArticle._id }, {});
  } catch (err) {
    console.log("Err: " + err);
    return error(res);
  }
};

// [PUT] /api/admin/articles/{id}
export const putArticle = async (req, res, next) => {
  try {
    const id = req.params.id;
    const objectId = new mongoose.Types.ObjectId(id);
    const article = req.body;

    const updateArticle = {
      ...article,
      article_slug: createSlug(article.article_name),
    };

    const putArticle = await Article.findOneAndUpdate({ _id: objectId }, updateArticle);

    if (!putArticle) return notFound(res, {});
    return ok(res, {});
  } catch (err) {
    console.log("Err: " + err);
    return error(res);
  }
};

// [DELETE] /api/admin/articles
export const deleteArticle = async (req, res, next) => {
  try {
    const ids = req.body.ids;
    if (!ids.length) return badRequest(res, {});

    const deleteResult = await Article.deleteMany({ _id: { $in: ids } });

    // Nếu không có tài liệu nào bị xóa, trả về notFound
    if (!deleteResult.deletedCount) return notFound(res, {});

    // Nếu có tài liệu bị xóa, trả về ok
    return ok(res, {});
  } catch (err) {
    console.log("Err: " + err);
    return error(res);
  }
};
