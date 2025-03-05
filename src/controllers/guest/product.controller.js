import Product from "../../models/product.model.js";
import { encryptData, decryptData } from "../../utils/security.js";
import { notFound, ok, error } from "../../handlers/respone.handler.js";

// [GET] /api/guest/product
export const getProducts = async (req, res, next) => {
  try {
    const {
      sort = "latest", // latest | rating
      page = 1,
      limit = 12,
      category_id,
    } = req.query;

    // Xây dựng query cơ bản
    let query = {};

    // Thêm filter theo category nếu có
    if (category_id) {
      query.categories = category_id;
    }

    // Xác định cách sắp xếp
    let sortOption = {};
    switch (sort) {
      case "latest":
        sortOption = { createdAt: -1 };
        break;
      case "rating":
        sortOption = { product_avg_rating: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    const products = await Product.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "categories",
          localField: "category_id",
          foreignField: "_id",
          as: "category_info",
        },
      },
      {
        $lookup: {
          from: "orders",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$$productId", "$order_products.product_id"],
                },
              },
            },
            {
              $unwind: "$order_products",
            },
            {
              $match: {
                $expr: {
                  $eq: ["$order_products.product_id", "$$productId"],
                },
              },
            },
            {
              $group: {
                _id: null,
                total_sold: { $sum: "$order_products.quantity" },
              },
            },
          ],
          as: "order_stats",
        },
      },
      {
        $addFields: {
          product_avg_rating: {
            $cond: [
              { $eq: ["$product_rating.rating_count", 0] },
              0,
              { $divide: ["$product_rating.rating_point", "$product_rating.rating_count"] },
            ],
          },
          highest_discount: {
            $max: "$product_variants.variant_discount_percent",
          },
          product_sold_quantity: {
            $cond: {
              if: { $gt: [{ $size: "$order_stats" }, 0] },
              then: { $arrayElemAt: ["$order_stats.total_sold", 0] },
              else: 0,
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          product_name: 1,
          product_slug: 1,
          product_imgs: { $arrayElemAt: ["$product_imgs", 0] },
          product_avg_rating: 1,
          product_short_description: 1,
          highest_discount: 1,
          product_sold_quantity: 1,
          category: {
            _id: { $arrayElemAt: ["$category_info._id", 0] },
            name: { $arrayElemAt: ["$category_info.category_name", 0] },
          },
          product_variants: {
            $map: {
              input: "$product_variants",
              as: "variant",
              in: {
                variant_name: "$$variant.variant_name",
                variant_slug: "$$variant.variant_slug",
                variant_price: "$$variant.variant_price",
                variant_discount_percent: "$$variant.variant_discount_percent",
                discounted_price: {
                  $subtract: [
                    "$$variant.variant_price",
                    {
                      $multiply: [
                        "$$variant.variant_price",
                        { $divide: ["$$variant.variant_discount_percent", 100] },
                      ],
                    },
                  ],
                },
              },
            },
          },
          createdAt: 1,
        },
      },
      { $sort: sortOption },
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: parseInt(limit) },
    ]);

    // Đếm tổng số sản phẩm để phân trang
    const totalProducts = await Product.countDocuments(query);

    return ok(res, {
      products,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(totalProducts / limit),
        total_items: totalProducts,
        items_per_page: parseInt(limit),
      },
    });
  } catch (err) {
    console.log("Err: " + err);
    return error(res);
  }
};

// [GET] /api/guest/product/:pid
export const getProduct = async (req, res, next) => {
  try {
    const encryptedProductId = req.params.pid;

    if (!encryptedProductId) {
      return error(res, "Product ID is missing");
    }

    let productId;
    try {
      productId = decryptData(encryptedProductId); // Giải mã Product ID
    } catch (err) {
      return error(res, "Invalid Product ID");
    }

    // Tìm sản phẩm và lấy thông tin của danh mục và đánh giá gần đây
    const product = await Product.findOne({ _id: productId })
      .populate({
        path: "category_id",
        select: "category_name", // Lấy tên danh mục
      })
      .populate({
        path: "recent_reviews",
        select:
          "_id product_variant_name review_rating user_info review_imgs review_video review_context createdAt",
      });

    if (!product) {
      return notFound(res, { message: "Product Not Found" });
    }

    const transformedProduct = {
      _id: product._id,
      product_id_hashed: encryptData(product._id.toString()),
      product_name: product.product_name,
      product_slug: product.product_slug,
      category_name: product.category_id?.category_name || "Unknown",
      product_imgs: product.product_imgs,
      product_avg_rating: product.product_rating,
      product_sold_quantity: product.product_sold_quantity,
      product_short_description: product.product_short_description,
      product_description: product.product_description,
      product_specifications: product.product_specifications,
      product_variants: product.product_variants,
      review_count: product.review_count,
      recent_reviews: product.recent_reviews,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };

    return ok(res, { product: transformedProduct });
  } catch (err) {
    console.error("Error in getProduct:", err);
    return error(res, err.message);
  }
};

// [GET] /api/guest/product/getRecommend/:pid
export const getRecommend = async (req, res, next) => {
  try {
    const encryptedProductId = req.params.pid;

    if (!encryptedProductId) {
      return error(res, "Product ID is missing");
    }

    let productId;
    try {
      productId = decryptData(encryptedProductId); // Giải mã Product ID
    } catch (err) {
      return error(res, "Invalid Product ID");
    }

    // Tìm sản phẩm gốc
    const product = await Product.findOne({ _id: productId }).populate("category_id");

    if (!product) {
      return notFound(res, { message: "Product Not Found" });
    }

    const productCategory = product.category_id?._id;
    if (!productCategory) {
      return error(res, "Product category not found");
    }

    // Lấy sản phẩm liên quan cùng danh mục (trừ sản phẩm hiện tại)
    const relatedProducts = await Product.find({
      category_id: productCategory,
      _id: { $ne: productId },
    });

    const transformedProducts = relatedProducts.map((relatedProduct) => {
      const lowestPriceVariant = relatedProduct.product_variants.reduce(
        (minPriceVariant, variant) => {
          const discountedPrice =
            (variant.variant_price * (100 - variant.variant_discount_percent)) / 100;
          if (!minPriceVariant || discountedPrice < minPriceVariant.discountedPrice) {
            minPriceVariant = { ...variant, discountedPrice };
          }
          return minPriceVariant;
        },
        null
      );

      const highestDiscountVariant = relatedProduct.product_variants.reduce(
        (maxDiscountVariant, variant) => {
          if (
            !maxDiscountVariant ||
            variant.variant_discount_percent > maxDiscountVariant.variant_discount_percent
          ) {
            maxDiscountVariant = variant;
          }
          return maxDiscountVariant;
        },
        null
      );

      return {
        product_id_hashed: encryptData(relatedProduct._id.toString()),
        product_name: relatedProduct.product_name,
        product_slug: relatedProduct.product_slug,
        product_avg_rating: relatedProduct.product_rating,
        product_img: relatedProduct.product_imgs[0],
        lowest_price: lowestPriceVariant?.discountedPrice || null,
        product_price: lowestPriceVariant?.variant_price || null,
        highest_discount: highestDiscountVariant?.variant_discount_percent || null,
        product_sold_quantity: relatedProduct.product_sold_quantity,
        category_name: relatedProduct.category_id?.name || "Unknown",
        variant_id: lowestPriceVariant?._id || null,
        variant_name: lowestPriceVariant?.variant_name || null,
        variant_slug: lowestPriceVariant?.variant_slug || null,
      };
    });

    return ok(res, { relatedProducts: transformedProducts }, "Trả dữ liệu thành công");
  } catch (err) {
    console.error("Error in getRecommend:", err);
    return error(res, err.message);
  }
};
