// import libs
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

// read json file
const rawArticles = JSON.parse(
  fs.readFileSync(
    path.join(import.meta.dirname, "..", "raw-data", "FORCATSHOP.articles.json"),
    "utf8"
  )
);

// preprocess
const tempUserId = new mongoose.Types.ObjectId();
const preprocessedArticles = rawArticles.map((article) => ({
  _id: article._id["$oid"],
  user_id: tempUserId,
  article_name: article.article_name,
  article_slug: article.article_slug,
  article_avt: article.article_avt.link,
  article_author_name: article.article_info.author,
  article_published_date: article.article_info.published_date["$date"],
  article_short_description: article.article_short_description,
  article_content: article.article_content,
}));
// console.log("preprocessedArticles: ", preprocessedArticles);

// save to json file
fs.writeFile(
  path.join(import.meta.dirname, "..", "preprocessed-data", "articles.preprocessed.json"),
  JSON.stringify(preprocessedArticles),
  (error) => {
    if (error) console.error("Lỗi khi lưu tệp JSON:", error);
    else console.log("Kết quả đã được lưu vào tệp articles.preprocessed.json");
  }
);
