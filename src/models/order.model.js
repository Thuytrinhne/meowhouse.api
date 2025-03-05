import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    order_id: { type: String, required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    order_buyer: {
      name: { type: String },
      phone_number: { type: String },
      address: {
        province: { type: String },
        district: { type: String },
        ward: { type: String },
        street: { type: String },
      },
    },
    order_products: [
      {
        product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        variant_id: { type: mongoose.Schema.Types.ObjectId, required: true },
        quantity: { type: Number, required: true },
        unit_price: { type: Number, required: true },
        discount_percent: { type: Number, required: true },
      },
    ],
    order_rating: [
      {
        product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        variant_id: { type: mongoose.Schema.Types.ObjectId },
        rating_point: { type: Number, min: 1, max: 5, default: 5 },
        comment: { type: String, default: "" },
        images: [{ type: String }],
        videos: [{ type: String }],
        rating_date: { type: Date, default: Date.now },
      },
    ],
    order_note: { type: String },
    payment_method: { type: String, enum: ["cod", "onl"] },
    shipping_cost: { type: Number },
    final_cost: { type: Number },
    applied_coupons: [{ type: mongoose.Schema.Types.ObjectId, ref: "Coupon" }],
    order_status: {
      type: String,
      enum: ["unpaid", "delivering", "delivered", "canceled"],
      default: "unpaid",
    },
    payment_link: { type: String },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
