// models/MembershipLevel.js
import mongoose from "mongoose";

const membershipLevelSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      enum: ["bronze", "silver", "gold", "diamond"],
      required: true,
    },
    perks: {
      type: [String], // Lưu các ưu đãi theo dạng danh sách
      required: true,
    },
    minSpent: {
      type: Number,
      required: true, // Ví dụ: mức chi tiêu tối thiểu để đạt được hạng
    },
    minOrders: {
      type: Number,
      required: true, // Số đơn hàng tối thiểu để đạt được hạng
    },
  },
  { timestamps: true }
);

const MembershipLevel = mongoose.model("MembershipLevel", membershipLevelSchema);
export default MembershipLevel;
