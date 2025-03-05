import mongoose from "mongoose";

import { getCldPublicIdFromUrl, extractImageLinksFromHTML } from "../utils/functions/format.js";
import cloudinary from "../libs/cloudinary.js";

const productSchema = new mongoose.Schema(
  {
    product_name: {
      type: String,
      required: true,
    },
    product_slug: {
      type: String,
      required: true,
    },
    product_imgs: [
      {
        type: String,
        required: true,
      },
    ],
    product_short_description: {
      type: String,
    },
    product_description: {
      type: String,
      required: true,
    },
    product_sold_quantity: {
      type: Number,
      min: 0,
      default: 0,
      get: function (value) {
        return value !== undefined ? value : 100;
      },
    },
    product_specifications: [
      {
        name: {
          type: String,
        },
        value: {
          type: String,
        },
      },
    ],
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    product_variants: [
      {
        variant_name: {
          type: String,
          required: true,
        },
        variant_slug: {
          type: String,
          required: true,
        },
        variant_img: {
          type: String,
          required: true,
        },
        variant_price: {
          type: Number,
          required: true,
        },
        variant_stock_quantity: {
          type: Number,
          required: true,
        },
        variant_discount_percent: {
          type: Number,
          default: 0,
        },
      },
    ],
    product_rating: {
      rating_point: {
        type: Number,
        default: 0,
      },
      rating_count: {
        type: Number,
        default: 0,
      },
    },
    review_count: [Number],
    recent_reviews: [
      {
        user_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        user_name: {
          type: String,
          required: true,
        },
        user_avt: {
          type: String,
          required: true,
        },
        review_date: {
          type: Date,
          required: true,
        },
        variant_name: {
          type: String,
          required: true,
        },
        review_content: {
          type: String,
          required: true,
        },
        review_imgs: [
          {
            type: String,
          },
        ],
        review_vids: [
          {
            type: String,
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

// Pre-hook to delete Cloudinary resources when deleting products
productSchema.pre("deleteMany", async function (next) {
  // Get the list of products based on the delete query
  const products = await this.model.find(this.getQuery());

  // Collect public IDs from product_imgs, product_variants, and product_description
  const publicIds = products.flatMap((product) => [
    // Collect public IDs from product_imgs if they are Cloudinary URLs
    ...product.product_imgs
      .filter(
        (url) => url.startsWith("https://res.cloudinary.com/") || url.startsWith("SEO_Images")
      )
      .map((url) => getCldPublicIdFromUrl(url)),

    // Collect public IDs from product_variants.variant_img if they are Cloudinary URLs
    ...product.product_variants.flatMap((variant) =>
      variant.variant_img &&
      (variant.variant_img.startsWith("https://res.cloudinary.com/") ||
        variant.variant_img.startsWith("SEO_Images"))
        ? getCldPublicIdFromUrl(variant.variant_img)
        : []
    ),

    // Collect public IDs from images in product_description if they are Cloudinary URLs
    ...extractImageLinksFromHTML(product.product_description || "")
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

const Product = mongoose.model("Product", productSchema);
export default Product;
