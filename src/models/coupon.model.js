import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    coupon_name: { type: String, required: true },
    coupon_description: { type: String },
    coupon_type: { type: String, enum: ["Free Ship", "Order"], default: "Order", required: true }, // Loại mã: Freeship hoặc Trừ tiền
    coupon_condition: { type: Number, required: true }, // Giảm khi đơn lớn hơn m tiền (áp dụng cho tất cả khi điều kiện = 0)
    coupon_unit: { type: String, enum: ["%", "đ"], default: "đ", required: true }, // Đơn vị giảm % hoặc đ
    coupon_value: { type: Number, required: true }, // Giá trị giảm
    coupon_max_value: { type: Number }, // Giá trị giảm tối đa (áp dụng cho mã theo %)
    coupon_stock_quantity: { type: Number, required: true }, // Số lượng mã giảm
    start_time: { type: Date, required: true }, // Thời gian mở lấy mã
    end_time: { type: Date, required: true }, // Thời gian đóng lấy mã
  },
  { timestamps: true }
);

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
