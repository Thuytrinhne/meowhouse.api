import mongoose from "mongoose";

// Notification Schema
const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Tăng tốc truy vấn theo userId
    },
    type: {
      type: String,
      enum: ["order", "promotion", "system", "account", "payment"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true, // Tăng tốc truy vấn thông báo chưa đọc
    },
    actionUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // Tự động thêm createdAt và updatedAt
  }
);

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
