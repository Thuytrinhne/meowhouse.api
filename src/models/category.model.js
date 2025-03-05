import mongoose from "mongoose";

import { getCldPublicIdFromUrl } from "../utils/functions/format.js";
import cloudinary from "../libs/cloudinary.js";

const categorySchema = new mongoose.Schema(
  {
    category_name: { type: String, required: true },
    category_img: { type: String, required: true },
    category_products_count: { type: Number },
  },
  { timestamps: true }
);

// Add pre-hook to delete Cloudinary resources when deleting categories
categorySchema.pre("deleteMany", async function (next) {
  // Get the list of categories based on the delete query
  const categories = await this.model.find(this.getQuery());

  // Collect public IDs from category_img if they match Cloudinary URLs
  const publicIds = categories
    .map((category) => category.category_img)
    .filter((url) => url.startsWith("https://res.cloudinary.com/") || url.startsWith("SEO_Images"))
    .map((url) => getCldPublicIdFromUrl(url));

  // Delete resources in Cloudinary if there are any public IDs
  if (publicIds.length > 0) {
    await cloudinary.api.delete_resources(publicIds, {
      resource_type: "image",
    });
  }

  next();
});

const Category = mongoose.model("Category", categorySchema);
export default Category;
