import mongoose from "mongoose";
import Product from "../../models/product.model.js";
import User from "../../models/user.model.js";
import { ok, notFound, error, badRequest } from "../../handlers/respone.handler.js";
import { decryptData, encryptData } from "../../utils/security.js";

// [POST] /cart/:userId
export const getUserCart = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const localCart = req.body;

    if (!userId || userId == "undefined") return ok(res, { user_cart: localCart });

    const userInfo = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },
    ]);

    if (!userInfo) return ok(res, { user_cart: localCart });

    const decryptedLocalCart = localCart.map((item) => ({
      product_id: decryptData(item.product_hashed_id),
      variant_id: item.variant_id,
      quantity: item.quantity,
    }));
    const userCart = userInfo[0].user_cart.map((item) => ({
      product_id: item.product_id.toString(),
      variant_id: item.variant_id.toString(),
      quantity: item.quantity,
    }));

    const mergedCart = [...decryptedLocalCart, ...userCart];

    // Sử dụng reduce để gom các sản phẩm trùng lặp lại.
    const cartData = mergedCart.reduce((acc, current) => {
      const existingProductIndex = acc.findIndex(
        (item) => item.variant_id === current.variant_id && item.product_id === current.product_id
      );

      if (existingProductIndex !== -1) {
        // Nếu đã tồn tại trong giỏ hàng, cộng dồn số lượng.
        acc[existingProductIndex].quantity = current.quantity;
      } else {
        // Nếu chưa tồn tại, thêm vào.
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

    // Đảm bảo rằng cartProducts là một mảng hợp lệ
    if (!Array.isArray(cartProducts) || cartProducts.length === 0) {
      return badRequest(res, "Cart products are required");
    }

    const cart = cartProducts.map((item) => ({
      product_id: new mongoose.Types.ObjectId(decryptData(item.product_hashed_id)),
      variant_id: new mongoose.Types.ObjectId(item.variant_id),
      quantity: item.quantity,
    }));

    // Tìm người dùng và lấy giỏ hàng hiện tại
    const user = await User.findById(userId);
    if (!user) return badRequest(res, "User not found");

    // Cập nhật giỏ hàng bằng cách thêm hoặc cập nhật sản phẩm
    const updatedCart = user.user_cart.map((existingItem) => {
      const newProduct = cart.find(
        (item) =>
          item.product_id.equals(existingItem.product_id) &&
          item.variant_id.equals(existingItem.variant_id)
      );
      if (newProduct) {
        existingItem.quantity = newProduct.quantity; // Cập nhật số lượng nếu sản phẩm đã có
        return existingItem;
      }
      return existingItem;
    });

    // Thêm sản phẩm mới vào giỏ hàng nếu nó không có trong giỏ hàng cũ
    const newItems = cart.filter(
      (item) =>
        !updatedCart.some(
          (existingItem) =>
            existingItem.product_id.equals(item.product_id) &&
            existingItem.variant_id.equals(item.variant_id)
        )
    );
    updatedCart.push(...newItems);

    // Cập nhật giỏ hàng trong cơ sở dữ liệu
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { user_cart: updatedCart },
      { new: true }
    );

    if (!updatedUser) return badRequest(res, "Can not update user cart");

    return ok(res, { user_cart: updatedUser.user_cart }, "User cart update successfully");
  } catch (err) {
    console.error("Error in putUserCart:", err);
    return error(res, "Internal Server Error");
  }
};
