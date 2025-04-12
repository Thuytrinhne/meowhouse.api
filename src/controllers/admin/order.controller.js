import Order from "../../models/order.model.js";
import { ok, error, notFound, badRequest } from "../../handlers/respone.handler.js";
import mongoose from "mongoose";
import { decryptData, encryptData } from "../../utils/security.js";
import cloudinary from "../../libs/cloudinary.js";
import { Readable } from "stream";

// [GET] /api/admin/orders
export const getOrders = async (req, res) => {
  try {
    const {
      status,
      sort = "createdAt",
      order = "desc",
      page = 1,
      limit = 10,
      product_name = "",
      order_id = "",
      phone_number = "",
    } = req.query;

    let query = {};

    // Thêm bộ lọc theo trạng thái
    if (status) {
      query.order_status = status;
    }

    // Thêm bộ lọc theo order_id
    const orderIdPattern = new RegExp(`^${order_id}\\..*`, "i"); // Thêm flag "i" để không phân biệt hoa thường

    if (order_id) {
      query.order_id = {
        $regex: orderIdPattern, // Không cần thay đổi gì ở đây, vì pattern đã bao gồm flag "i"
      };
    }

    // Thêm bộ lọc theo số điện thoại
    if (phone_number) {
      query["order_buyer.phone_number"] = phone_number;
    }

    const sortObj = {};
    sortObj[sort] = order === "asc" ? 1 : -1;

    // Aggregation pipeline
    const orders = await Order.aggregate([
      { $match: query },
      // Unwind order_products để xử lý từng sản phẩm
      { $unwind: "$order_products" },
      // Lookup để lấy thông tin product
      {
        $lookup: {
          from: "products",
          let: {
            productId: { $toObjectId: "$order_products.product_id" },
            variantId: { $toObjectId: "$order_products.variant_id" },
          },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$productId"] },
              },
            },
            {
              $project: {
                _id: 1,
                product_name: 1,
                product_imgs: { $arrayElemAt: ["$product_imgs", 0] },
                variant: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$product_variants",
                        as: "v",
                        cond: { $eq: ["$$v._id", "$$variantId"] },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          ],
          as: "product_info",
        },
      },
      // Lọc sản phẩm theo product_name
      ...(product_name
        ? [
            {
              $match: {
                "product_info.product_name": {
                  $regex: product_name,
                  $options: "i",
                },
              },
            },
          ]
        : []),
      // Thêm thông tin product vào order_products
      {
        $addFields: {
          "order_products.product_name": {
            $arrayElemAt: ["$product_info.product_name", 0],
          },
          "order_products.product_img": {
            $arrayElemAt: ["$product_info.product_imgs", 0],
          },
          "order_products.variant_name": {
            $arrayElemAt: ["$product_info.variant.variant_name", 0],
          },
          "order_products.variant_img": {
            $arrayElemAt: ["$product_info.variant.variant_img", 0],
          },
        },
      },
      // Gom nhóm lại
      {
        $group: {
          _id: "$_id",
          order_id: { $first: "$order_id" },
          user_id: { $first: "$user_id" },
          order_buyer: { $first: "$order_buyer" },
          order_note: { $first: "$order_note" },
          shipping_cost: { $first: "$shipping_cost" },
          final_cost: { $first: "$final_cost" },
          order_status: { $first: "$order_status" },
          createdAt: { $first: "$createdAt" },
          payment_method: { $first: "$payment_method" },
          order_products: {
            $push: {
              product_id: "$order_products.product_id",
              variant_id: "$order_products.variant_id",
              quantity: "$order_products.quantity",
              unit_price: "$order_products.unit_price",
              discount_percent: "$order_products.discount_percent",
              product_name: "$order_products.product_name",
              product_img: "$order_products.product_img",
              variant_name: "$order_products.variant_name",
              variant_img: "$order_products.variant_img",
            },
          },
        },
      },
      // Sort và phân trang
      { $sort: sortObj },
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: parseInt(limit) },
    ]);

    // Đếm tổng số orders phù hợp với điều kiện filter
    const total = await Order.aggregate([
      { $match: query },
      { $unwind: "$order_products" },
      {
        $lookup: {
          from: "products",
          let: { productId: { $toObjectId: "$order_products.product_id" } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$productId"] },
              },
            },
          ],
          as: "product_info",
        },
      },
      ...(product_name
        ? [
            {
              $match: {
                "product_info.product_name": {
                  $regex: product_name,
                  $options: "i",
                },
              },
            },
          ]
        : []),
      { $group: { _id: "$_id" } },
      { $count: "total" },
    ]);

    const totalCount = total.length > 0 ? total[0].total : 0;

    const transformedOrders = orders.map((order) => ({
      ...order,
      order_id_hashed: encryptData(order._id.toString()),
      order_products: order.order_products.map((product) => ({
        ...product,
        product_hashed_id: encryptData(product.product_id.toString()),
      })),
    }));

    // Trả về dữ liệu
    return res.json({
      success: true,
      data: {
        orders: transformedOrders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          total_pages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (err) {
    console.error("Error in getOrders API:", err); // Log lỗi chi tiết
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
