import Order from "../../models/order.model.js";
import { ok, error, notFound, badRequest } from "../../handlers/respone.handler.js";
import mongoose from "mongoose";
import { decryptData, encryptData } from "../../utils/security.js";
import cloudinary from "../../libs/cloudinary.js";
import { Readable } from "stream";

// [GET] /api/orders
export const getOrders = async (req, res) => {
  try {
    const user_id = req.user?.user_id; // Lấy user_id từ request
    console.log("user id", user_id);
    if (!user_id) {
      return res.status(400).json({ success: false, message: "User ID is required." });
    }

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

    // Kiểm tra và chuyển đổi user_id sang ObjectId
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({ success: false, message: "Invalid User ID." });
    }

    let query = { user_id: new mongoose.Types.ObjectId(user_id) }; // Dùng 'new' để tạo ObjectId hợp lệ

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

// [GET] /api/orders/[:id]
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.user_id;

    // console.log("Request Params ID:", id);
    // console.log("User ID:", user_id);

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error("Invalid order ID");
      return error(res, "Invalid order ID");
    }

    const orderId = new mongoose.Types.ObjectId(id);

    // Aggregation pipeline
    const order = await Order.aggregate([
      {
        $match: {
          _id: orderId,
          user_id: new mongoose.Types.ObjectId(user_id),
        },
      },
      {
        $unwind: "$order_products",
      },
      {
        $lookup: {
          from: "products",
          let: {
            productId: "$order_products.product_id",
            variantId: "$order_products.variant_id",
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
          updatedAt: { $first: "$updatedAt" },
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
    ]);

    // Kiểm tra nếu không tìm thấy đơn hàng
    if (!order || order.length === 0) {
      console.error("Order not found with ID:", orderId);
      return notFound(res, "Order not found");
    }

    // Log kết quả
    // console.log("Order Found:", JSON.stringify(order[0], null, 2));
    const enrichedOrder = {
      ...order[0],
      order_id_hashed: encryptData(order[0]._id.toString()), // Thêm hash ID tại đây
    };
    // Trả về kết quả
    return ok(res, { order: enrichedOrder });
  } catch (err) {
    console.error("Error fetching order:", err);
    if (err.name === "CastError") {
      return error(res, "Invalid order ID");
    }
    return error(res, "Internal server error");
  }
};

// [GET] /api/orders/track
export const trackOrder = async (req, res) => {
  try {
    const { order_id, phone_number } = req.query;

    // console.log("Order ID:", order_id);
    // console.log("Phone Number:", phone_number);

    // Kiểm tra đầu vào
    if (!order_id || !phone_number) {
      return res.status(400).json({ message: "Order ID và số điện thoại là bắt buộc" });
    }

    // Kiểm tra định dạng số điện thoại
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(phone_number)) {
      return res.status(400).json({ message: "Số điện thoại không hợp lệ" });
    }

    // Xây dựng biểu thức regex cho order_id
    const orderIdPattern = new RegExp(`^${order_id}\\..*`);

    const order = await Order.aggregate([
      {
        $match: {
          order_id: { $regex: orderIdPattern, $options: "i" }, // Khớp regex không phân biệt chữ hoa/thường
          "order_buyer.phone_number": phone_number,
        },
      },
      {
        $unwind: "$order_products", // Phân rã order_products để xử lý từng sản phẩm
      },
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
      {
        $addFields: {
          "order_products.product_name": { $arrayElemAt: ["$product_info.product_name", 0] },
          "order_products.product_img": { $arrayElemAt: ["$product_info.product_imgs", 0] },
          "order_products.variant_name": {
            $arrayElemAt: ["$product_info.variant.variant_name", 0],
          },
          "order_products.variant_img": { $arrayElemAt: ["$product_info.variant.variant_img", 0] },
          "order_products.total_price": {
            $multiply: ["$order_products.unit_price", "$order_products.quantity"],
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          order_id: { $first: "$order_id" },
          order_buyer: { $first: "$order_buyer" },
          order_note: { $first: "$order_note" },
          shipping_cost: { $first: "$shipping_cost" },
          final_cost: {
            $first: {
              $add: ["$shipping_cost", "$final_cost"],
            },
          },
          payment_method: { $first: "$payment_method" },
          applied_coupons: { $first: "$applied_coupons" },
          order_status: { $first: "$order_status" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
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
              total_price: "$order_products.total_price",
            },
          },
        },
      },
    ]);
    // console.log("Response:", order);

    if (!order || order.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    return ok(res, { order: order[0] }, "Không tìm thấy đơn hàng");
    // return res.status(200).json({ order: order[0] }, { message: "Thành công" });
  } catch (err) {
    console.error("Lỗi khi tra cứu đơn hàng:", err);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// [GET] /api/orders/getOrder/:orderId
export const getOrderByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;

    // console.log("Request Params orderId:", orderId);

    // Validate orderId
    if (!orderId || typeof orderId !== "string") {
      console.error("Invalid order ID format");
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      });
    }

    // Aggregation pipeline
    const order = await Order.aggregate([
      {
        $match: {
          order_id: orderId, // Chỉ dựa vào order_id để tìm kiếm
        },
      },
      {
        $unwind: "$order_products",
      },
      {
        $lookup: {
          from: "products",
          let: {
            productId: "$order_products.product_id",
            variantId: "$order_products.variant_id",
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
          updatedAt: { $first: "$updatedAt" },
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
    ]);

    // Kiểm tra nếu không tìm thấy đơn hàng
    if (!order || order.length === 0) {
      console.error("Order not found with order_id:", orderId);
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const returnOrder = { ...order[0], order_id_hashed: encryptData(order[0]._id.toString()) };

    // Trả về kết quả
    return res.status(200).json({
      success: true,
      data: { order: returnOrder },
    });
  } catch (err) {
    console.error("Error fetching order by order_id:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// [PUT] /api/orders/cancel/:id
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    // console.log("Order ID from params:", orderId); // Kiểm tra giá trị của orderId

    if (!orderId) {
      return badRequest(res, { success: false, message: "Order ID is required." });
    }

    if (!mongoose.Types.ObjectId.isValid(orderId) && !orderId.startsWith("DH")) {
      return badRequest(res, { success: false, message: "Invalid order ID." });
    }

    const orderMatch = orderId.startsWith("DH")
      ? { order_id: { $regex: orderId, $options: "i" } }
      : { _id: orderId };
    const order = await Order.findOne(orderMatch);

    if (!order) {
      return notFound(res, {
        success: false,
        message: "Order not found or you don't have permission to update this order.",
      });
    }

    // Cập nhật trạng thái đơn hàng thành "Đã hủy"
    await Order.updateOne(
      orderMatch,
      { $set: { order_status: "canceled" } } // Cập nhật trạng thái thành "Đã hủy"
    );

    return ok(res, { success: true, message: "Order status updated to 'canceled'." });
  } catch (err) {
    console.error("Error updating order status:", err);
    return error(res, { success: false, message: "Internal server error" });
  }
};

// [GET] /api/orders/[:hashed_id]
export const getOrderByHashedId = async (req, res) => {
  try {
    const { hashedId: order_hashed_id } = req.params;

    // console.log("baaaaaaaaaaaaaaaaaaa", order_hashed_id);
    const user_id = req.user.user_id;

    // Giải mã hashed ID
    let decryptedId;
    try {
      decryptedId = decryptData(order_hashed_id); // Giải mã ID
    } catch (err) {
      console.error("Invalid or corrupted hashed order ID");
      return error(res, "Invalid order ID");
    }

    // Kiểm tra tính hợp lệ của ID đã giải mã
    if (!mongoose.Types.ObjectId.isValid(decryptedId)) {
      console.error("Invalid decrypted order ID");
      return error(res, "Invalid order ID");
    }

    const orderId = new mongoose.Types.ObjectId(decryptedId);

    // Aggregation pipeline
    const order = await Order.aggregate([
      {
        $match: {
          _id: orderId,
          user_id: new mongoose.Types.ObjectId(user_id),
        },
      },
      {
        $unwind: "$order_products",
      },
      {
        $lookup: {
          from: "products",
          let: {
            productId: "$order_products.product_id",
            variantId: "$order_products.variant_id",
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
          updatedAt: { $first: "$updatedAt" },
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
    ]);

    // Kiểm tra nếu không tìm thấy đơn hàng
    if (!order || order.length === 0) {
      console.error("Order not found with ID:", orderId);
      return notFound(res, "Order not found");
    }

    // Thêm hashed ID vào kết quả trả về
    const enrichedOrder = {
      ...order[0],
      order_id_hashed: order_hashed_id, // Trả lại hashed ID để khớp với đầu vào
    };

    return ok(res, { order: enrichedOrder });
  } catch (err) {
    console.error("Error fetching order:", err);
    if (err.name === "CastError") {
      return error(res, "Invalid order ID");
    }
    return error(res, "Internal server error");
  }
};

// Hàm upload tệp (ảnh hoặc video) lên Cloudinary
const uploadFileToCloudinary = async (fileBuffer, folder, resourceType = "image") => {
  try {
    const uploadFromBuffer = () => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder, resource_type: resourceType },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        Readable.from(fileBuffer).pipe(uploadStream);
      });
    };

    const result = await uploadFromBuffer();
    return result.secure_url;
  } catch (error) {
    console.error(`Error uploading ${resourceType} to Cloudinary:`, error);
    throw new Error(`${resourceType} upload failed`);
  }
};

// [POST] "/api/orders/rating/:pid/:productId"
export const addProductRatingWithMedia = async (req, res) => {
  try {
    const { pid: hashedOrderId, productId } = req.params;
    const { rating_point, comment } = req.body;
    const user_id = req.user?.user_id;
    const images = req.files?.images || [];
    const videos = req.files?.videos || [];

    // console.log("Hashed Order id: ", hashedOrderId);
    // console.log("Product id: ", productId);
    // console.log("Rating point: ", rating_point);
    // console.log("Comment: ", comment);
    // console.log("User id: ", user_id);
    // console.log("Images received: ", images);
    // console.log("Videos received: ", videos);

    // Giải mã hashedOrderId
    let orderId;
    try {
      orderId = decryptData(hashedOrderId);
    } catch (decodeError) {
      console.error("Failed to decode hashedOrderId:", decodeError);
      return res.status(400).json({ success: false, message: "Invalid hashed Order ID" });
    }

    // Kiểm tra tính hợp lệ của orderId và productId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      console.error("Invalid decoded orderId:", orderId);
      return res.status(400).json({ success: false, message: "Invalid Order ID" });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      console.error("Invalid productId:", productId);
      return res.status(400).json({ success: false, message: "Invalid Product ID" });
    }

    // Kiểm tra thông tin đơn hàng
    const order = await Order.findOne({
      _id: orderId,
      user_id,
      "order_products.product_id": productId,
    });

    if (!order) {
      console.error("Order not found for user_id:", user_id);
      return res.status(404).json({ success: false, message: "Order or product not found" });
    }

    // Nếu chưa có order_rating, khởi tạo mảng mới
    if (!order.order_rating) {
      order.order_rating = [];
    }

    // Xử lý upload hình ảnh lên Cloudinary
    const uploadedImageUrls = [];
    for (const image of images) {
      try {
        const imageUrl = await uploadFileToCloudinary(
          image.buffer,
          "product_ratings/images",
          "image"
        );
        uploadedImageUrls.push(imageUrl);
      } catch (uploadError) {
        console.error("Error uploading image:", uploadError);
      }
    }

    // Xử lý upload video lên Cloudinary
    const uploadedVideoUrls = [];
    for (const video of videos) {
      try {
        const videoUrl = await uploadFileToCloudinary(
          video.buffer,
          "product_ratings/videos",
          "video"
        );
        uploadedVideoUrls.push(videoUrl);
      } catch (uploadError) {
        console.error("Error uploading video:", uploadError);
      }
    }

    // Tạo đối tượng rating
    const rating = {
      product_id: productId,
      rating_point: parseInt(rating_point) || 5,
      comment: comment || "",
      images: uploadedImageUrls,
      videos: uploadedVideoUrls,
      rating_date: new Date(),
    };

    // Thêm đánh giá vào order_rating
    order.order_rating.push(rating);

    // Lưu thay đổi vào cơ sở dữ liệu
    await order.save();

    console.log("Rating added successfully for order:", orderId);
    return res.status(200).json({ success: true, message: "Rating added successfully", rating });
  } catch (error) {
    console.error("Unexpected error in addProductRatingWithMedia:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// [GET] "/api/orders/rating/getContent"
export const getOrderRatings = async (req, res) => {
  try {
    const { hashedId } = req.params; // Lấy `hashedId` từ URL params
    const user_id = req.user?.user_id; // Xác định người dùng từ middleware xác thực

    // Giải mã hashedId để lấy orderId
    let orderId;
    try {
      orderId = decryptData(hashedId); // Sử dụng hàm decryptData để giải mã hashedId
      // console.log("Decrypted Order ID:", orderId);
    } catch (error) {
      console.error("Failed to decrypt hashedId:", error);
      return res.status(400).json({ success: false, message: "Invalid hashed Order ID" });
    }

    // Kiểm tra tính hợp lệ của orderId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      console.error("Invalid decrypted Order ID:", orderId);
      return res.status(400).json({ success: false, message: "Invalid Order ID" });
    }

    // Tìm đơn hàng
    const order = await Order.findOne({
      _id: orderId,
      user_id,
    });

    if (!order) {
      console.error("Order not found for user_id:", user_id);
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Kiểm tra xem order_rating có tồn tại hay không
    if (!order.order_rating || order.order_rating.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No ratings found for this order",
        ratings: [],
      });
    }

    // Trả về danh sách đánh giá
    return res.status(200).json({
      success: true,
      message: "Ratings retrieved successfully",
      ratings: order.order_rating,
    });
  } catch (error) {
    console.error("Error fetching order ratings:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
