import mongoose from "mongoose";

import { getCldPublicIdFromUrl, extractImageLinksFromHTML } from "../utils/functions/format.js";
import cloudinary from "../libs/cloudinary.js";

const articleSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // tam thoi xoa required
    article_name: { type: String, required: true },
    article_slug: { type: String, required: true },
    article_avt: { type: String, required: true },
    article_short_description: { type: String, required: true },
    article_author_name: { type: String },
    article_published_date: { type: Date },
    article_content: { type: String, required: true },
    article_references: [
      { title: { type: String, required: true }, link: { type: String, required: true } },
    ],
    article_tags: [{ type: String }],
  },
  { timestamps: true }
);

// Pre-hook to delete Cloudinary resources when deleting articles
articleSchema.pre("deleteMany", async function (next) {
  // Get the list of articles based on the delete query
  const articles = await this.model.find(this.getQuery());

  // Collect public IDs from article_avt and images in article_description
  const publicIds = articles.flatMap((article) => [
    // Collect public ID from article_avt if it's a Cloudinary URL
    ...(article.article_avt &&
    (article.article_avt.startsWith("https://res.cloudinary.com/") ||
      article.article_avt.startsWith("SEO_Images"))
      ? [getCldPublicIdFromUrl(article.article_avt)]
      : []),

    // Collect public IDs from images in article_description if they are Cloudinary URLs
    ...extractImageLinksFromHTML(article.article_description || "")
      .filter(
        (url) => url.startsWith("https://res.cloudinary.com/") || url.startsWith("SEO_Images")
      )
      .map((url) => getCldPublicIdFromUrl(url)),
  ]);

  // Delete resources in Cloudinary if there are any public IDs
  if (publicIds.length > 0) {
    await cloudinary.api.delete_resources(publicIds, {
      resource_type: "image",
    });
  }

  next();
});

const Article = mongoose.model("Article", articleSchema);
export default Article;
