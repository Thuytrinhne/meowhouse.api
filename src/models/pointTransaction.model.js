import mongoose from "mongoose";

const pointTransactionSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["earn", "redeem"], required: true },
    amount: { type: Number, required: true },
    source: {
      type: String,
      enum: ["daily_checkin", "purchase", "gift", "refund", "expired"],
      default: "daily_checkin",
    },
    description: { type: String },
    expires_at: { type: Date }, // chỉ có nếu là điểm có hạn dùng
  },
  { timestamps: true }
);

const PointTransaction = mongoose.model("PointTransaction", pointTransactionSchema);
export default PointTransaction;
