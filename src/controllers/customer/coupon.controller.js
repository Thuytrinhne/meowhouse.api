import mongoose from "mongoose";

import Coupon from "../../models/coupon.model.js";
import User from "../../models/user.model.js";
import { notFound, ok, error, created, badRequest } from "../../handlers/respone.handler.js";
import { encryptData, decryptData } from "../../utils/security.js";

// [GET] /api/customer/coupons?userId
export const getCoupons = async (req, res, next) => {
  try {
    const userId = req.query.userId; // Lấy userId từ query parameter

    // Lấy danh sách tất cả coupons
    const coupons = await Coupon.aggregate([{ $match: {} }, { $sort: { createdAt: -1 } }]);

    if (!coupons.length) return notFound(res, "No coupons found");

    let userOwnedCoupons = [];

    // Nếu có userId, lấy thông tin saved_coupons của người dùng
    if (userId) {
      const userInfo = await User.findById(userId).select("saved_coupons");

      if (!userInfo) return notFound(res, "User not found");

      // Lấy danh sách ID của saved_coupons
      userOwnedCoupons = userInfo.saved_coupons.map((coupon) => coupon.toString());
    }

    // Thêm category_id_hashed và isOwned (nếu có userId)
    const transformedCoupons = coupons.map((coupon) => {
      const isOwned = userId ? userOwnedCoupons.includes(coupon._id.toString()) : false;
      return {
        ...coupon,
        _id: undefined,
        coupon_id_hashed: encryptData(coupon._id.toString()),
        isOwned,
      };
    });

    return ok(res, transformedCoupons);
  } catch (err) {
    console.error("Error: ", err);
    return error(res, "Internal Server Error");
  }
};

export const getUserCoupons = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    let limit = req.query.limit;

    if (!userId || userId == "undefined") return badRequest(res, "User ID is required");

    // Kiểm tra giá trị của limit
    if (limit === "all") {
      limit = null; // Không áp dụng giới hạn
    } else if (limit === "default" || !limit) {
      limit = 10; // Giới hạn mặc định
    } else {
      limit = parseInt(limit, 10);
      if (isNaN(limit) || limit <= 0) {
        return badRequest(res, "Limit must be a positive number or 'all'");
      }
    }

    // Lấy thông tin người dùng
    const userInfo = await User.findById(userId).populate("saved_coupons"); // Populate để lấy thông tin chi tiết của coupons
    if (!userInfo) return notFound(res, "User not found");

    // Lấy danh sách saved_coupons
    const userCoupons = userInfo.saved_coupons;

    // Truy vấn để lấy danh sách coupon có id nằm trong userCoupons
    const aggregationPipeline = [
      { $match: { _id: { $in: userCoupons } } }, // Lọc theo _id
      { $sort: { createdAt: -1 } }, // Sắp xếp giảm dần theo createdAt
    ];

    if (limit) aggregationPipeline.push({ $limit: limit });

    const coupons = await Coupon.aggregate(aggregationPipeline);

    const hashedCoupons = coupons.map((coupon) => ({
      ...coupon,
      coupon_hashed_id: encryptData(coupon._id.toString()),
      _id: undefined,
    }));

    return ok(res, hashedCoupons, "User coupons retrieved successfully");
  } catch (err) {
    console.error("Error:", err);
    return error(res);
  }
};

// [POST] /api/customer/coupons/:userId
export const addCoupon = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    if (!userId) return badRequest(res, "User ID is required");
    // console.log("userId", userId);

    const { coupon_id_hashed } = req.body;
    if (!coupon_id_hashed) return badRequest(res, "Coupon ID is required");
    // console.log("coupon_id_hashed", coupon_id_hashed);

    // Lấy thông tin người dùng bằng findOne để tránh trả về mảng
    const userInfo = await User.findById(userId);
    if (!userInfo) return notFound(res, "User not found");
    // console.log("userInfo", userInfo);

    const couponId = decryptData(coupon_id_hashed); // Giải mã coupon ID
    // console.log("couponId", couponId);

    // Kiểm tra nếu couponId đã tồn tại trong danh sách saved_coupons
    const userCoupons = userInfo.saved_coupons.map((coupon) => coupon.toString());
    if (userCoupons.includes(couponId)) {
      return badRequest(res, "Coupon already exists in user coupons");
    }

    // Thêm coupon mới vào saved_coupons
    userInfo.saved_coupons.push(new mongoose.Types.ObjectId(couponId));
    await userInfo.save(); // Lưu thông tin người dùng vào database
    // console.log("Updated userInfo", userInfo);

    return ok(res, "Coupon added successfully");
  } catch (err) {
    console.error("Error:", err);
    return error(res, "Internal Server Error");
  }
};
