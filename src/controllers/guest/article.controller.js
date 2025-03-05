import Article from "../../models/article.model.js";
import { ok, notFound, error, badRequest } from "../../handlers/respone.handler.js";
import { decryptData, encryptData } from "../../utils/security.js";
import { parseRawHTML } from "../../utils/parseRawHTML.js";

const hashArticleId = (article) => {
  if (!article._doc._id) {
    console.warn("Missing article ID:", article);
    return null; // Bỏ qua bài viết không hợp lệ
  }

  const articleId = article._doc._id.toString(); // Chuyển ObjectId sang chuỗi
  article._doc.article_id_hashed = encryptData(articleId);
  article._doc._id = undefined; // Xóa `_id` sau khi mã hóa
  return article;
};

const getRelatedArticles = async ({ article_slug }) => {
  const numberLimitArticle = 6;
  const sortedFields = { createdAt: -1 };

  try {
    const articles = await Article.find(
      { article_slug: { $ne: article_slug } }, // Loại trừ bài viết hiện tại
      { article_content: 0 }
    )
      .limit(numberLimitArticle)
      .sort(sortedFields)
      .exec();

    return articles
      .map(hashArticleId) // Mã hóa ID bài viết
      .filter((article) => article !== null); // Lọc bài viết không hợp lệ
  } catch (err) {
    console.error("Error fetching related articles:", err);
    return [];
  }
};

// [GET] /api/articles/all - Fetch all articles without pagination
export const getAllArticles = async (req, res) => {
  try {
    const articles = await Article.find({}, { article_content: 0 }).exec();

    if (!articles || articles.length === 0) {
      return notFound(res, "No articles found");
    }

    const handledArticles = articles
      .map(hashArticleId) // Mã hóa ID bài viết
      .filter((article) => article !== null); // Lọc bài viết không hợp lệ

    return ok(res, handledArticles);
  } catch (err) {
    console.error("Error fetching all articles:", err.message);
    return error(res, "An error occurred while fetching articles");
  }
};

// [GET] /api/articles?page=&limit= - Fetch paginated articles
export const getPaginatedArticles = async (req, res) => {
  const page = parseInt(req.query?.page) > 0 ? parseInt(req.query?.page) : 1;
  const limit = parseInt(req.query?.limit) > 0 ? parseInt(req.query?.limit) : 10;

  try {
    const query = {};
    const sorted_fields = { createdAt: -1, _id: -1 };

    const totalArticles = await Article.countDocuments(query).exec();
    const maxPage = Math.ceil(totalArticles / limit);

    if (totalArticles === 0) {
      return notFound(res, "No articles available for pagination");
    }

    if (page > maxPage) {
      return badRequest(res, "Page number exceeds the maximum available pages");
    }

    const articles = await Article.find(query, { article_content: 0 })
      .sort(sorted_fields)
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    const handledArticles = articles.map(hashArticleId).filter((article) => article !== null);

    return ok(res, { articles: handledArticles, maxPage });
  } catch (err) {
    console.error("Error fetching paginated articles:", err.message);
    return error(res, "An error occurred while fetching paginated articles");
  }
};

// [GET] /api/articles/:slug/:pid
export const getOneArticle = async (req, res) => {
  const { aid, slug } = req.params;

  if (!aid || !slug) {
    return badRequest(res, "Missing required parameters: aid or slug");
  }

  let articleId;
  try {
    articleId = decryptData(aid);
  } catch (err) {
    console.error("Error decrypting article ID:", err);
    return badRequest(res, "Invalid article ID provided");
  }

  const query = {
    _id: articleId,
    article_slug: slug,
  };

  try {
    const article = await Article.findOne(query, { _id: 0 }).exec();

    if (!article) {
      return notFound(res, "No article found with the given slug and ID");
    }

    const relatedArticles = await getRelatedArticles(article);
    article._doc.article_content = parseRawHTML(article.article_content);
    article._doc.related_articles = relatedArticles;

    return ok(res, article);
  } catch (err) {
    console.error("Error fetching single article:", err);
    return error(res, "An error occurred while fetching the article");
  }
};
