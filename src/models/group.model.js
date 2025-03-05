import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    group_name: { type: String, required: true },
    group_type: { type: String, enum: ["Product", "User"], required: true },
    group_items: [{ type: mongoose.Schema.Types.ObjectId, required: true }],
  },
  { timestamps: true }
);

const Group = mongoose.model("Group", groupSchema);
export default Group;
