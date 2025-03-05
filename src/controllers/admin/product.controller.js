import mongoose from "mongoose";

import Product from "../../models/product.model.js";
import { notFound, ok, error, badRequest, created } from "../../handlers/respone.handler.js";
import { createSlug } from "../../utils/functions/format.js";

// [GET] /api/admin/products
export const getProducts = async (req, res, next) => {
  try {
    const products = await Product.aggregate([
      {
        $lookup: {
          from: "categories", // Bảng (collection) Category
          localField: "category_id", // field trong Product
          foreignField: "_id", // field trong Category
          as: "category", // tên output
        },
      },
      {
        $unwind: "$category", // Giải nén mảng category để lấy ra đối tượng
      },
      {
        $project: {
          _id: 1, // Trả về _id của product
          product_img: { $arrayElemAt: ["$product_imgs", 0] }, // Lấy hình ảnh đầu tiên trong mảng product_imgs
          product_name: 1, // Trả về tên sản phẩm
          category: "$category.category_name", // Trả về tên category
          product_variants: {
            $map: {
              input: "$product_variants", // Duyệt qua từng phần tử trong mảng product_variants
              as: "variant",
              in: {
                variant_price: "$$variant.variant_price", // Lấy giá của variant
                variant_name: "$$variant.variant_name", // Lấy tên của variant
              },
            },
          },
          product_rating: {
            rating_point: "$product_rating.rating_point", // Lấy điểm rating
            rating_count: "$product_rating.rating_count", // Lấy số lượt rating
          },
          createdAt: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    // console.log("products: ", products);

    if (!products.length) return notFound(res, {});

    return ok(res, { products: products });
  } catch (err) {
    console.log("Err: " + err);
    return error(res, err.message);
  }
};

// [GET] /api/admin/products/{id}
export const getProduct = async (req, res, next) => {
  try {
    const id = req.params.id;
    const objectId = new mongoose.Types.ObjectId(id);
    const products = await Product.aggregate([
      {
        $match: { _id: objectId },
      },
    ]);

    // console.log("products: ", products);

    if (!products.length) return notFound(res, {});

    return ok(res, { product: products[0] });
  } catch (err) {
    console.log("Err: " + err);
    return error(res, err.message);
  }
};

// [POST] /api/admin/products
export const postProduct = async (req, res, next) => {
  try {
    const product = req.body;

    const addProduct = {
      ...product,
      product_slug: createSlug(product.product_name),
      product_variants: product.product_variants.map((variant) => ({
        ...variant,
        variant_slug: createSlug(variant.variant_name),
      })),
    };

    // console.log("aaaaaaaaaaaa", addProduct);

    const newProduct = new Product(addProduct);

    const savedProduct = newProduct.save();

    if (!savedProduct) return badRequest(res, {});
    return created(res, { id: savedProduct._id }, {});
  } catch (err) {
    console.log("Err: " + err);
    return error(res);
  }
};

// [PUT] /api/admin/products/{id}
export const putProduct = async (req, res, next) => {
  try {
    const id = req.params.id;
    const objectId = new mongoose.Types.ObjectId(id);
    const product = req.body;

    const updateProduct = {
      ...product,
      product_slug: createSlug(product.product_name),
      product_variants: product.product_variants.map((variant) => ({
        ...variant,
        variant_slug: createSlug(variant.variant_name),
      })),
    };

    const putProduct = await Product.findOneAndUpdate({ _id: objectId }, updateProduct);

    if (!putProduct) return notFound(res, {});
    return ok(res, {});
  } catch (err) {
    console.log("Err: " + err);
    return error(res);
  }
};

// [DELETE] /api/admin/products
export const deleteProduct = async (req, res, next) => {
  try {
    const ids = req.body.ids;
    if (!ids.length) return badRequest(res, {});

    const deleteResult = await Product.deleteMany({ _id: { $in: ids } });

    // Nếu không có tài liệu nào bị xóa, trả về notFound
    if (!deleteResult.deletedCount) return notFound(res, {});

    // Nếu có tài liệu bị xóa, trả về ok
    return ok(res, {});
  } catch (err) {
    console.log("Err: " + err);
    return error(res);
  }
};
