// GET /rewards?type=voucher|gift|special|all
export const getRewards = async (req, res) => {
  try {
    const { type } = req.query;
    const query = {};
    if (type && type !== "all") {
      query.type = type;
    }
    const rewards = await Reward.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: rewards });
  } catch (error) {
    console.error("getRewards error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
