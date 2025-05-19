import UserPoint from "../../models/userPoint.model.js";
import PointTransaction from "../../models/pointTransaction.model.js";
import DailyCheckinLog from "../../models/dailyCheckinLog.model.js";
import dayjs from "dayjs";

// GET /points/summary
export const getPointSummary = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const userPoint = await UserPoint.findOne({ user_id });
    if (!userPoint) {
      return res.status(404).json({ success: false, message: "User point not found" });
    }

    const today = dayjs();
    const expiringPoints = await PointTransaction.find({
      user_id,
      expires_at: { $gte: today.toDate(), $lte: today.add(30, "day").toDate() },
      amount: { $gt: 0 },
    });

    res.status(200).json({
      success: true,
      data: {
        total_points: userPoint.total_points,
        available_points: userPoint.available_points,
        expiring_points: expiringPoints.map((p) => ({
          amount: p.amount,
          expires_at: p.expires_at,
        })),
      },
    });
  } catch (error) {
    console.error("getPointSummary error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /points/history?type=earn|use
export const getPointHistory = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { page = 1, limit = 10, type } = req.query;

    const query = { user_id };
    if (type === "earn") query.amount = { $gt: 0 };
    if (type === "use") query.amount = { $lt: 0 };

    const transactions = await PointTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await PointTransaction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: transactions,
      page: Number(page),
      total_pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("getPointHistory error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /points/checkin-status
export const getCheckinStatus = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const logs = await DailyCheckinLog.find({ user_id }).sort({ day_index: 1 });

    const days = Array.from({ length: 7 }, (_, i) => {
      const log = logs.find((l) => l.day_index === i + 1);
      return {
        day: i + 1,
        reward: i === 6 ? 300 : i === 5 ? 200 : 100,
        checked_in: !!log,
        checkin_date: log?.checkin_date || null,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        days,
        current_day_index: logs.length + 1,
        can_checkin_today: !logs.some((log) => dayjs(log.checkin_date).isSame(dayjs(), "day")),
      },
    });
  } catch (error) {
    console.error("getCheckinStatus error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /points/checkin
export const checkin = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const today = dayjs().startOf("day");
    const existingLog = await DailyCheckinLog.findOne({
      user_id,
      checkin_date: { $gte: today.toDate(), $lte: today.endOf("day").toDate() },
    });

    if (existingLog) {
      return res.status(400).json({ success: false, message: "Already checked in today" });
    }

    const checkinCount = await DailyCheckinLog.countDocuments({ user_id });
    const day_index = checkinCount + 1 > 7 ? 1 : checkinCount + 1;

    const reward = day_index === 7 ? 300 : day_index === 6 ? 200 : 100;

    // Update points
    const userPoint = await UserPoint.findOneAndUpdate(
      { user_id },
      {
        $inc: { total_points: reward, available_points: reward },
        last_updated: new Date(),
      },
      { new: true, upsert: true }
    );

    // Log transaction
    await PointTransaction.create({
      user_id,
      amount: reward,
      type: "earn",
      source: "daily_checkin",
      description: `Check-in ngày ${day_index}`,
      expires_at: dayjs().add(180, "day").toDate(),
    });

    // Log check-in
    await DailyCheckinLog.create({
      user_id,
      day_index,
      reward,
      checkin_date: today.toDate(),
    });

    res.status(200).json({
      success: true,
      message: "Check-in thành công",
      data: { reward, day_index },
    });
  } catch (error) {
    console.error("checkin error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /points/redeem
export const redeemPoints = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { amount, description, target } = req.body;

    const userPoint = await UserPoint.findOne({ user_id });
    if (!userPoint || userPoint.available_points < amount) {
      return res.status(400).json({ success: false, message: "Not enough points" });
    }

    userPoint.available_points -= amount;
    await userPoint.save();

    await PointTransaction.create({
      user_id,
      amount: -amount,
      source: target,
      description,
    });

    res.status(200).json({
      success: true,
      message: "Đổi xu thành công",
      remaining_points: userPoint.available_points,
    });
  } catch (error) {
    console.error("redeemPoints error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
