import User from "../../models/user.model.js";
import { ok, error, notFound, badRequest } from "../../handlers/respone.handler.js";
import cloudinary from "../../libs/cloudinary.js";
import { Readable } from "stream";
import { getCldPublicIdFromUrl } from "../../utils/functions/format.js";

// [GET] /api/user/profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.user_id; // Get from decoded token
    const user = await User.findById(userId).select("-user_password -refresh_token");

    if (!user) {
      return notFound(res, "User not found");
    }

    return ok(res, { user });
  } catch (err) {
    console.log("Error:", err);
    return error(res, "Internal server error");
  }
};

// [PUT] /api/user/profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const updateData = req.body;
    const avatarFile = req.file;

    const allowedUpdates = [
      "user_name",
      "user_avt",
      "user_gender",
      "user_birth_day",
      "user_phone_number",
    ];

    const updates = {};

    // Xử lý upload ảnh nếu có file mới
    if (avatarFile) {
      try {
        // Tìm user để lấy avatar cũ
        const currentUser = await User.findById(userId);

        // Xóa ảnh cũ trên cloudinary nếu có
        if (currentUser.user_avt) {
          const publicId = getCldPublicIdFromUrl(currentUser.user_avt);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        }

        // Upload ảnh mới lên cloudinary
        const uploadFromBuffer = () => {
          return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { folder: "avatars" },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            Readable.from(avatarFile.buffer).pipe(uploadStream);
          });
        };

        const uploadResult = await uploadFromBuffer();
        updates.user_avt = uploadResult.secure_url;
      } catch (uploadError) {
        console.error("Upload error:", uploadError);
        return error(res, "Error uploading image");
      }
    }

    // Validate các field trước khi update
    let validationError = null;

    // Xử lý các field khác
    for (const key of Object.keys(updateData)) {
      if (allowedUpdates.includes(key)) {
        // Validate phone number format
        if (key === "user_phone_number") {
          const phoneRegex = /^[0-9]{10,11}$/;
          if (!phoneRegex.test(updateData[key])) {
            validationError = "Invalid phone number format";
            break;
          }
        }

        // Validate birth date format
        if (key === "user_birth_day") {
          const date = new Date(updateData[key]);
          if (isNaN(date.getTime())) {
            validationError = "Invalid birth date format";
            break;
          }
        }

        // Validate gender
        if (key === "user_gender") {
          const validSexValues = ["Nam", "Nữ", "Khác"];
          if (!validSexValues.includes(updateData[key])) {
            validationError = "Invalid sex value";
            break;
          }
        }

        updates[key] = updateData[key];
      }
    }

    // Kiểm tra lỗi validation
    if (validationError) {
      return badRequest(res, validationError);
    }

    if (Object.keys(updates).length === 0) {
      return badRequest(res, "No valid fields to update");
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true }).select(
      "-user_password -refresh_token"
    );

    if (!updatedUser) {
      return notFound(res, "User not found");
    }

    return ok(res, {
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.log("Error:", err);
    return error(res, "Internal server error");
  }
};
