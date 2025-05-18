import mongoose from "mongoose";

const dailyCheckinLogSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    day_index: { type: Number, required: true }, // Ví dụ: 1 -> Ngày 1, 2 -> Ngày 2,...
    reward: { type: Number, required: true }, // Ví dụ: 100 xu
    checkin_date: { type: Date, required: true }, // Ngày người dùng checkin
  },
  { timestamps: true } // tạo createdAt & updatedAt tự động
);

const DailyCheckinLog = mongoose.model("DailyCheckinLog", dailyCheckinLogSchema);
export default DailyCheckinLog;
