import { Readable } from "stream";
import cloudinary from "../../libs/cloudinary.js";
import { ok, error, notFound } from "../../handlers/respone.handler.js";

export const uploadImages = async (req, res) => {
  try {
    const folder = req.body.folder || "uploads"; // Lấy folder từ req.body hoặc mặc định là 'uploads'
    const files = req.files || []; // Lấy files từ req.files

    // console.log("folderfolderfolderfolder", folder);
    // console.log("filesfilesfilesfilesfiles", files);

    if (files.length === 0) {
      return res.status(400).json({ message: "Không có tài nguyên" }); // Trả về lỗi nếu không có tệp nào
    }

    // Hàm xử lý upload từ buffer
    const uploadFromBuffer = (buffer) => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
          if (result) resolve(result); // Nếu upload thành công, trả về kết quả
          else reject(error); // Nếu có lỗi, trả về lỗi
        });

        Readable.from(buffer).pipe(uploadStream); // Chuyển buffer thành stream và upload
      });
    };

    // Xử lý upload tất cả các files
    const uploadPromises = files.map(async (file) => {
      const buffer = file.buffer; // Lấy buffer từ từng file
      return uploadFromBuffer(buffer); // Upload buffer
    });

    const results = await Promise.all(uploadPromises); // Chờ tất cả upload hoàn thành
    const secureUrls = results.map((result) => result.secure_url); // Lấy các URL an toàn từ kết quả

    // console.log("secureUrlssecureUrlssecureUrls", secureUrls);

    return ok(res, {
      message: "Thêm tài nguyên thành công", // Thông báo thành công
      urls: secureUrls, // Trả về danh sách URL
    });
  } catch (err) {
    console.error("Lỗi:", err); // Ghi nhận lỗi
    return error(res, { err }); // Trả về lỗi
  }
};

export const deleteImages = async (req, res) => {
  try {
    const data = req.body;
    const publicIds = data.cldPublicIds;

    const resCloudinary = await cloudinary.api.delete_resources(publicIds, {
      resource_type: "image",
    });

    const deletedItems = [];
    const notFoundItems = [];

    for (const publicId in resCloudinary.deleted) {
      if (Object.prototype.hasOwnProperty.call(resCloudinary.deleted, publicId)) {
        if (resCloudinary.deleted[publicId] === "deleted") {
          deletedItems.push(publicId);
        } else if (resCloudinary.deleted[publicId] === "not_found") {
          notFoundItems.push(publicId);
        }
      }
    }

    if (notFoundItems.length === publicIds.length) {
      return notFound(res, {
        message: "Không tìm thấy hoặc không xóa được tài nguyên",
      });
    }

    if (deletedItems.length === publicIds.length) {
      return ok(res, {
        message: `Xóa thành công ${deletedItems.length} tài nguyên`,
      });
    }

    return ok(res, {
      message: `Xóa thành công ${deletedItems.length}, thất bại ${notFoundItems.length} tài nguyên`,
    });
  } catch (err) {
    console.error("Lỗi: ", err);
    return error(res, { err });
  }
};
