import mongoose from "mongoose";

import Category from "../../models/category.model.js";
import { notFound, ok, error, created } from "../../handlers/respone.handler.js";

// [GET] / api/admin/categories
export const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.aggregate([{ $match: {} }, { $sort: { createdAt: -1 } }]);

    // console.log("products: ", products);

    if (!categories.length) return notFound(res, {});

    return ok(res, { categories: categories });
  } catch (err) {
    console.log("Err: " + err);
    return error(res);
  }
};

// [GET] / api/admin/categories/{id}
export const getCategory = async (req, res, next) => {
  try {
    const id = req.params.id;
    const objectId = new mongoose.Types.ObjectId(id);
    const categories = await Category.aggregate([
      {
        $match: { _id: objectId },
      },
    ]);

    // console.log("products: ", products);

    if (!categories.length) return notFound(res, {});

    return ok(res, { category: categories[0] });
  } catch (err) {
    console.log("Err: " + err);
    return error(res);
  }
};

// [POST] /api/admin/categories
export const postCategory = async (req, res, next) => {
  try {
    const category = req.body;

    const addCategory = {
      ...category,
    };

    // console.log("aaaaaaaaaaaa", addCategory);

    const newCategory = new Category(addCategory);

    const savedCategory = newCategory.save();

    if (!savedCategory) return badRequest(res, {});
    return created(res, { id: savedCategory._id }, {});
  } catch (err) {
    console.log("Err: " + err);
    return error(res);
  }
};

// [PUT] /api/admin/categories/{id}
export const putCategory = async (req, res, next) => {
  try {
    const id = req.params.id;
    const objectId = new mongoose.Types.ObjectId(id);
    const category = req.body;

    const updateCategory = {
      ...category,
    };

    const putCategory = await Category.findOneAndUpdate({ _id: objectId }, updateCategory);

    if (!putCategory) return notFound(res, {});
    return ok(res, {});
  } catch (err) {
    console.log("Err: " + err);
    return error(res);
  }
};

// [DELETE] /api/admin/categories
export const deleteCategory = async (req, res, next) => {
  try {
    const ids = req.body.ids;
    if (!ids.length) return badRequest(res, {});

    const deleteResult = await Category.deleteMany({ _id: { $in: ids } });

    // Nếu không có tài liệu nào bị xóa, trả về notFound
    if (!deleteResult.deletedCount) return notFound(res, {});

    // Nếu có tài liệu bị xóa, trả về ok
    return ok(res, {});
  } catch (err) {
    console.log("Err: " + err);
    return error(res);
  }
};
