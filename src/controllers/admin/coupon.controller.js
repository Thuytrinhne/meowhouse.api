import mongoose from "mongoose";

import Coupon from "../../models/coupon.model.js";
import { notFound, ok, error, badRequest, created } from "../../handlers/respone.handler.js";

// [GET] /api/admin/coupons
export const getCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.aggregate([
      {
        $match: {},
      },
      { $sort: { createdAt: -1 } },
    ]);

    // console.log("coupons: ", coupons);

    if (!coupons.length) return notFound(res, {});

    return ok(res, { coupons: coupons });
  } catch (err) {
    console.log("Err: " + err);
    return error(res, err.message);
  }
};

// [GET] /api/admin/coupons/{id}
export const getCoupon = async (req, res, next) => {
  try {
    const id = req.params.id;
    const objectId = new mongoose.Types.ObjectId(id);
    const coupons = await Coupon.aggregate([
      {
        $match: { _id: objectId },
      },
    ]);

    // console.log("coupons: ", coupons);

    if (!coupons.length) return notFound(res, {});

    return ok(res, { coupon: coupons[0] });
  } catch (err) {
    console.log("Err: " + err);
    return error(res, err.message);
  }
};

// [POST] /api/admin/coupons
export const postCoupon = async (req, res, next) => {
  try {
    const coupon = req.body;

    const addCoupon = {
      ...coupon,
    };

    // console.log("aaaaaaaaaaaa", addCoupon);

    const newCoupon = new Coupon(addCoupon);

    const savedCoupon = newCoupon.save();

    if (!savedCoupon) return badRequest(res, {});
    return created(res, { id: savedCoupon._id }, {});
  } catch (err) {
    console.log("Err: " + err);
    return error(res);
  }
};

// [PUT] /api/admin/coupons/{id}
export const putCoupon = async (req, res, next) => {
  try {
    const id = req.params.id;
    const objectId = new mongoose.Types.ObjectId(id);
    const coupon = req.body;

    const updateCoupon = {
      ...coupon,
    };

    const putCoupon = await Coupon.findOneAndUpdate({ _id: objectId }, updateCoupon);

    if (!putCoupon) return notFound(res, {});
    return ok(res, {});
  } catch (err) {
    console.log("Err: " + err);
    return error(res);
  }
};

// [DELETE] /api/admin/coupons
export const deleteCoupon = async (req, res, next) => {
  try {
    const ids = req.body.ids;
    if (!ids.length) return badRequest(res, {});

    const deleteResult = await Coupon.deleteMany({ _id: { $in: ids } });

    // Nếu không có tài liệu nào bị xóa, trả về notFound
    if (!deleteResult.deletedCount) return notFound(res, {});

    // Nếu có tài liệu bị xóa, trả về ok
    return ok(res, {});
  } catch (err) {
    console.log("Err: " + err);
    return error(res);
  }
};
