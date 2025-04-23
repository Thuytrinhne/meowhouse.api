import User from "../models/user.model.js";
import Order from "../models/order.model.js";

import MembershipLevel from "../models/membershipLevel.model.js";

export async function getMembershipLevel(totalSpent, completedOrders) {
  // Tìm hạng thành viên phù hợp với tổng chi tiêu và số đơn hàng
  const membership = await MembershipLevel.findOne({
    minSpent: { $lte: totalSpent },
    minOrders: { $lte: completedOrders },
  }).sort({ minSpent: -1, minOrders: -1 });

  // Nếu không tìm thấy cấp bậc nào, trả về "bronze" mặc định
  if (!membership) {
    return "bronze";
  }

  // Trả về hạng thành viên phù hợp
  return membership.level;
}

export async function updateUserAfterOrder(userId) {
  const user = await User.findById(userId);
  if (!user) return;

  // Lấy toàn bộ đơn hàng đã hoàn thành
  const deliveredOrders = await Order.find({
    user_id: userId,
    order_status: "delivered",
  });

  const completedOrders = deliveredOrders.length;

  // Tính tổng chi tiêu từ đơn đã giao
  const totalSpent = deliveredOrders.reduce((sum, order) => sum + (order.final_cost || 0), 0);

  // Xác định hạng thành viên mới
  user.membership_level = await getMembershipLevel(totalSpent, completedOrders);

  await user.save();

  console.log(userId, totalSpent, completedOrders, user.membership_level);
}

export async function updateAllUsersMembership() {
  console.log("Đang cập nhật cấp bậc thành viên...");
  const users = await User.find({}, "_id");

  for (const user of users) {
    await updateUserAfterOrder(user._id);
  }

  console.log("✅ Membership cập nhật xong lúc 0h");
}
