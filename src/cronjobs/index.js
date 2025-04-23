import { scheduleMembershipCron } from "./membership.cron.js";
// import các cron khác sau này

export function startAllCrons() {
  scheduleMembershipCron();
  // gọi thêm các cron khác nếu có
}
