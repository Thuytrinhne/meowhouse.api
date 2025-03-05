import mongoose from "mongoose";

import Category from "../../models/category.model.js";
import { notFound, ok, error, created } from "../../handlers/respone.handler.js";
import { encryptData, decryptData } from "../../utils/security.js";

// [GET] / api/categories
export const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.aggregate([{ $match: {} }, { $sort: { createdAt: -1 } }]);

    // Thêm category_id_hashed bằng cách áp dụng hàm encryptData
    const transformedCatrgories = categories.map((category) => ({
      ...category,
      category_id_hashed: encryptData(category._id.toString()),
    }));
    // console.log("products: ", products);

    if (!transformedCatrgories.length) return notFound(res, {});

    return ok(res, transformedCatrgories);
  } catch (err) {
    console.log("Err: " + err);
    return error(res);
  }
};

// [GET] /api/categories/:categoryId
export const getCategoryById = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const decryptedCategoryId = decryptData(categoryId);

    const category = await Category.findById(decryptedCategoryId);

    if (!category) return notFound(res, {});

    const transformedCategory = {
      ...category.toObject(),
      category_id_hashed: encryptData(category._id.toString()),
    };

    return ok(res, transformedCategory);
  } catch (err) {
    console.log("Err: " + err);
    return error(res);
  }
};
