import mongoose from "mongoose";

const userPointsSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    total_points: { type: Number, default: 0 },
    available_points: { type: Number, default: 0 },
    last_updated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const UserPoints = mongoose.model("UserPoints", userPointsSchema);
export default UserPoints;
