import mongoose from "mongoose";

const wardSchema = new mongoose.Schema({
  ward_id: { type: Number, required: true, unique: true },
  ward_name: { type: String, required: true },
  district_id: { type: Number, required: true },
  last_updated_at: { type: Date, default: Date.now },
});

const Ward = mongoose.model("Ward", wardSchema);
export default Ward;
