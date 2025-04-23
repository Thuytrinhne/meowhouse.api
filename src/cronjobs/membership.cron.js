import cron from "node-cron";
import { updateAllUsersMembership } from "../utils/membership.js";

// Chạy lúc 0h mỗi ngày
export function scheduleMembershipCron() {
  // Cronjob chạy 00h mỗi ngày để cập nhật thứ hạng người dùng
  cron.schedule("0 0 * * *", async () => {
    await updateAllUsersMembership();
  });
  // [TEST] Cronjob chạy mỗi phút
  cron.schedule("* * * * *", () => {
    console.log("Cronjob chạy mỗi phút", new Date().toLocaleString());
    // Gọi hàm xử lý ở đây, ví dụ: gửi mail, cập nhật trạng thái, dọn rác,...
  });
}
