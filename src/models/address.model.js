import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User", // Tham chiếu tới bảng User
  },
  full_name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    match: /^[0-9]{10,11}$/, // Kiểm tra số điện thoại hợp lệ
  },
  province: {
    id: {
      type: String,
      required: true,
    }, // province_id
    name: {
      type: String,
      required: true,
    },
  },
  district: {
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
  },
  ward: {
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
  },
  detail_address: {
    type: String,
    required: true,
    trim: true,
  },
  is_default: {
    type: Boolean,
    default: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// Middleware: Cập nhật `updated_at` khi chỉnh sửa địa chỉ
addressSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

const Address = mongoose.model("Address", addressSchema);

export default Address;
