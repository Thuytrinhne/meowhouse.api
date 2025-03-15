import mongoose from "mongoose";
import Product from "../../models/product.model.js";
import User from "../../models/user.model.js";
import { ok, notFound, error, badRequest } from "../../handlers/respone.handler.js";
import { decryptData, encryptData } from "../../utils/security.js";

// [POST] /cart/:userId
export const getUserCart = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const localCart = req.body?.length ? req.body : []; // Nếu không có localCart, mặc định là mảng rỗng.

    if (!userId || userId === "undefined") {
      return ok(res, { user_cart: localCart });
    }

    const userInfo = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },
    ]);

    if (!userInfo || !userInfo.length) {
      return ok(res, { user_cart: localCart });
    }

    const userCart = userInfo[0].user_cart.map((item) => ({
      product_id: item.product_id.toString(),
      variant_id: item.variant_id.toString(),
      quantity: item.quantity,
    }));

    // Nếu không có localCart, trả về giỏ hàng của user luôn
    if (localCart.length === 0) {
      return ok(res, {
        user_cart: userCart.map((item) => ({
          product_hashed_id: encryptData(item.product_id),
          variant_id: item.variant_id,
          quantity: item.quantity,
        })),
      });
    }

    // Nếu có localCart, hợp nhất với giỏ hàng của user
    const decryptedLocalCart = localCart.map((item) => ({
      product_id: decryptData(item.product_hashed_id),
      variant_id: item.variant_id,
      quantity: item.quantity,
    }));

    const mergedCart = [...decryptedLocalCart, ...userCart];

    // Gộp sản phẩm trùng nhau
    const cartData = mergedCart.reduce((acc, current) => {
      const existingProductIndex = acc.findIndex(
        (item) => item.variant_id === current.variant_id && item.product_id === current.product_id
      );

      if (existingProductIndex !== -1) {
        acc[existingProductIndex].quantity = current.quantity;
      } else {
        acc.push({ ...current });
      }

      return acc;
    }, []);

    const cart = cartData.map((item) => ({
      product_hashed_id: encryptData(item.product_id),
      variant_id: item.variant_id,
      quantity: item.quantity,
    }));

    return ok(res, { user_cart: cart });
  } catch (err) {
    console.log("Error in getUserCart: ", err);
    return error(res, "Internal Server Error");
  }
};

// [POST] /cart
export const getCartProducts = async (req, res, next) => {
  try {
    // Chuẩn bị dữ liệu từ client (decrypt các product_hashed_id)
    const cart = req.body.map((item) => ({
      product_id: new mongoose.Types.ObjectId(decryptData(item.product_hashed_id)),
      variant_id: new mongoose.Types.ObjectId(item.variant_id),
      quantity: item.quantity,
    }));

    // console.log("carttttttttt", cart);

    // // Truy xuất dữ liệu từ MongoDB
    const cartProducts = await Product.aggregate([
      {
        $addFields: {
          cartData: cart, // Thêm dữ liệu giỏ hàng vào sản phẩm
        },
      },
      {
        $match: {
          $expr: {
            $in: ["$_id", cart.map((item) => item.product_id)], // Lọc theo product_id trong giỏ hàng
          },
        },
      },
      {
        $unwind: "$cartData", // Giải nén các item trong giỏ hàng
      },
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ["$_id", "$cartData.product_id"] }, // Kiểm tra trùng khớp product_id
              { $in: ["$cartData.variant_id", "$product_variants._id"] }, // Kiểm tra trùng khớp variant_id
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
          product_name: 1,
          product_slug: 1,
          product_id: "$cartData.product_id",
          variant_id: "$cartData.variant_id",
          product_variants: 1,
          quantity: "$cartData.quantity",
        },
      },
    ]);

    if (!cartProducts.length) return notFound(res, {});

    // Mã hóa product_id trước khi trả về
    const response = cartProducts.map((product) => ({
      ...product,
      product_hashed_id: encryptData(product.product_id.toString()),
    }));

    return ok(res, { products: response });
  } catch (err) {
    console.error("Error in getCartProducts:", err);
    return error(res, "Internal Server Error");
  }
};

export const putUserCart = async (req, res, next) => {
  try {
    const { userId, cartProducts } = req.body;

    if (!userId) return badRequest(res, "User id is required");

    // Kiểm tra cartProducts có phải là mảng hợp lệ không
    if (!Array.isArray(cartProducts)) {
      return badRequest(res, "Cart products must be an array");
    }

    // Chuyển đổi dữ liệu giỏ hàng: giải mã product_hashed_id và chuyển sang ObjectId
    const cart = cartProducts
      .map((item) => {
        const productId = decryptData(item.product_hashed_id);
        if (!productId) return null; // Nếu giải mã thất bại, bỏ qua item này
        return {
          product_id: new mongoose.Types.ObjectId(productId),
          variant_id: new mongoose.Types.ObjectId(item.variant_id),
          quantity: item.quantity, // Có thể là số dương hoặc số âm (để cộng/trừ)
        };
      })
      .filter((item) => item !== null); // Lọc bỏ các phần tử không hợp lệ

    // Tìm người dùng và lấy giỏ hàng hiện tại
    const user = await User.findById(userId);
    if (!user) return badRequest(res, "User not found");

    let updatedCart = [...user.user_cart];

    // Cập nhật số lượng nếu sản phẩm đã có, hoặc thêm sản phẩm mới
    cart.forEach((newItem) => {
      const index = updatedCart.findIndex(
        (existingItem) =>
          existingItem.product_id.equals(newItem.product_id) &&
          existingItem.variant_id.equals(newItem.variant_id)
      );

      if (index !== -1) {
        // Nếu sản phẩm đã có, cộng dồn số lượng (sử dụng delta update)
        updatedCart[index].quantity += newItem.quantity;
      } else {
        // Nếu sản phẩm chưa có, thêm vào giỏ hàng chỉ khi số lượng > 0
        if (newItem.quantity > 0) {
          updatedCart.push(newItem);
        }
      }
    });

    // Loại bỏ sản phẩm có số lượng <= 0
    updatedCart = updatedCart.filter((item) => item.quantity > 0);

    // Cập nhật giỏ hàng trong database
    user.user_cart = updatedCart;
    await user.save();

    return ok(res, { user_cart: user.user_cart }, "User cart updated successfully");
  } catch (err) {
    console.error("Error in putUserCart:", err);
    return error(res, "Internal Server Error");
  }
};
