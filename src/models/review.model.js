import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    variant_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    review_content: { type: String, required: true },
    review_rating_point: { type: String, required: true },
    review_imgs: [{ type: String }],
    review_vids: [{ type: String }],
    review_date: { type: Date, required: true },
  },
  { timestamps: true }
);

const Review = mongoose.model("Review", reviewSchema);
export default Review;
