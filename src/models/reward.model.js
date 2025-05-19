import mongoose from "mongoose";

const rewardSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  points: { type: Number, required: true }, // số điểm để đổi
  image: { type: String }, // URL ảnh
  type: { type: String, enum: ["voucher", "gift", "special"], required: true },
  featured: { type: Boolean, default: false }, // ưu đãi đặc biệt có nổi bật không
  createdAt: { type: Date, default: Date.now },
});

const Reward = mongoose.model("Reward", rewardSchema);
export default Reward;
